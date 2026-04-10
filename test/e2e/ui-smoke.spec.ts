import { expect, test } from "@playwright/test";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { buildApp } from "../../src/app.js";

function createDbFile(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "soloboard-ui-test-")), "test.sqlite");
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate port")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

test("board renders and ticket dialog actions are wired", async ({ page }) => {
  const app = buildApp({
    dbFile: createDbFile(),
    staticDir: path.join(process.cwd(), "public"),
  });
  const port = await getFreePort();
  await app.listen({ host: "127.0.0.1", port });

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    const boardResponse = await page.request.post(`${baseUrl}/api/boards`, {
      data: { name: "UI Smoke", laneNames: ["todo", "done"] },
    });
    expect(boardResponse.status()).toBe(201);
    const boardPayload = await boardResponse.json();
    const todoLane = boardPayload.lanes[0];

    const ticketResponse = await page.request.post(`${baseUrl}/api/boards/${boardPayload.board.id}/tickets`, {
      data: {
        laneId: todoLane.id,
        title: "Smoke ticket",
        bodyMarkdown: "Body from **browser smoke**",
        priority: 3,
      },
    });
    expect(ticketResponse.status()).toBe(201);

    const relationTickets = [
      { title: "Parent candidate", priority: 8 },
      { title: "Blocker candidate", priority: 7 },
      { title: "Child candidate", priority: 6 },
    ];
    for (const ticket of relationTickets) {
      const relationResponse = await page.request.post(`${baseUrl}/api/boards/${boardPayload.board.id}/tickets`, {
        data: {
          laneId: todoLane.id,
          title: ticket.title,
          priority: ticket.priority,
        },
      });
      expect(relationResponse.status()).toBe(201);
    }

    await page.goto(`${baseUrl}/boards/${boardPayload.board.id}`);
    await expect(page.locator("#board-title")).toHaveText("UI Smoke");
    await expect(page.locator(".ticket-card")).toHaveCount(4);

    await page.getByRole("button", { name: "Smoke ticket" }).click();
    await expect(page.locator("#editor-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#editor-header-title")).toHaveText("Smoke ticket");
    await expect(page.locator("#editor-header-title")).toBeVisible();
    await expect(page.locator("#header-edit-button")).toBeVisible();
    await expect(page.locator("#save-comment-button")).toHaveClass(/primary-action/);

    await page.locator("#comment-body").fill("E2E comment **saved**");
    await page.locator("#save-comment-button").click();
    await expect(page.locator("#ticket-comments .comment-item")).toContainText("E2E comment saved");
    await expect(page.locator("#comment-body")).toHaveValue("");

    await page.locator("[data-edit-comment-id]").click();
    await expect(page.locator("#ux-dialog")).toHaveJSProperty("open", true);
    await page.locator('[data-field-id="bodyMarkdown"]').fill("E2E comment edited");
    await page.locator("#ux-submit-button").click();
    await expect(page.locator("#ux-dialog")).not.toHaveJSProperty("open", true);
    await expect(page.locator("#ticket-comments .comment-item")).toContainText("E2E comment edited");

    await page.locator("[data-delete-comment-id]").click();
    await expect(page.locator("#ux-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#ux-submit-button")).toHaveText("Delete");
    const deleteCommentResponse = page.waitForResponse((response) => response.url().includes("/api/comments/") && response.request().method() === "DELETE");
    await page.locator("#ux-submit-button").click();
    const deleteCommentResult = await deleteCommentResponse;
    expect(deleteCommentResult.status()).toBe(204);
    await expect(page.locator("#ux-dialog")).not.toHaveJSProperty("open", true);
    await expect(page.locator("#ticket-comments")).toContainText("No comments yet.");
    await page.locator("#activity-tab-button").click();
    await expect(page.locator("#activity-section")).toBeVisible();
    await expect(page.locator("#ticket-activity")).toContainText("Comment added");
    await expect(page.locator("#ticket-activity")).toContainText("Comment updated");
    await expect(page.locator("#ticket-activity")).toContainText("Comment deleted");
    await page.locator("#comments-tab-button").click();

    await page.locator("#header-edit-button").click();
    await expect(page.locator("#editor-form")).toBeVisible();
    await expect(page.locator("#save-ticket-button")).toHaveClass(/primary-action/);
    await expect(page.locator("#delete-ticket-button use[href='/icons.svg#trash-2']")).toHaveCount(1);
    await expect(page.locator("#editor-header-title")).toBeHidden();

    await page.locator("#ticket-new-tag-button").click();
    await expect(page.locator("#ux-dialog")).toHaveJSProperty("open", true);
    await page.locator('[data-field-id="name"]').fill("smoke-tag");
    await page.locator('[data-field-id="color"]').fill("#336699");
    await page.locator("#ux-submit-button").click();
    await expect(page.locator("#ux-dialog")).not.toHaveJSProperty("open", true);
    await expect(page.locator("#ticket-tag-summary")).toContainText("smoke-tag");
    await expect(page.locator("#ticket-tag-options [data-tag-id]")).toHaveCount(1);

    await page.locator("[data-remove-tag-id]").click();
    await expect(page.locator("#ticket-tag-summary")).not.toContainText("smoke-tag");

    await page.locator("#ticket-tag-search").fill("smoke");
    await page.locator("#ticket-tag-search").press("Enter");
    await expect(page.locator("#ticket-tag-summary")).toContainText("smoke-tag");

    await page.locator("#ticket-tag-toggle").click();
    await expect(page.locator("#ticket-tag-options")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#ticket-tag-options")).toBeHidden();
    await expect(page.locator("#ticket-tag-summary")).toContainText("smoke-tag");

    await page.locator("#ticket-tag-toggle").click();
    await expect(page.locator("#ticket-tag-options")).toBeVisible();
    await page.locator("#ticket-blocker-toggle").click();
    await expect(page.locator("#ticket-tag-options")).toBeHidden();

    await page.locator("#ticket-parent-search").fill("Parent");
    await page.locator("#ticket-parent-search").press("Enter");
    await expect(page.locator("#ticket-parent-summary")).toContainText("Parent candidate");
    await expect(page.locator("#ticket-child-summary")).toContainText("Clear parent to edit children");
    await page.locator("[data-remove-parent-id]").click();
    await expect(page.locator("#ticket-parent-summary")).toContainText("No parent");

    await page.locator("#ticket-blocker-search").fill("Blocker");
    await page.locator("#ticket-blocker-search").press("Enter");
    await expect(page.locator("#ticket-blocker-summary")).toContainText("Blocker candidate");
    await page.keyboard.press("Escape");
    await expect(page.locator("#ticket-blocker-options")).toBeHidden();

    await page.locator("#ticket-child-search").fill("Child");
    await page.locator("#ticket-child-search").press("Enter");
    await expect(page.locator("#ticket-child-summary")).toContainText("Child candidate");

    await page.locator("#save-ticket-button").click();
    await expect(page.locator("#ticket-view")).toBeVisible();
    await expect(page.locator("#ticket-relations")).toContainText("Blocked By");
    await expect(page.locator("#ticket-relations")).toContainText("Blocker candidate");
    await expect(page.locator("#ticket-relations")).toContainText("Children");
    await expect(page.locator("#ticket-relations")).toContainText("Child candidate");

    await page.locator("#header-edit-button").click();
    await expect(page.locator("#editor-form")).toBeVisible();

    await page.locator("#delete-ticket-button").click();
    await expect(page.locator("#ux-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#ux-submit-button")).toHaveText("Delete");
    await expect(page.locator("#ux-submit-button")).toHaveClass(/danger-confirm-action/);
    await expect(page.locator("#ux-submit-button use[href='/icons.svg#trash-2']")).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  } finally {
    await page.close();
    await app.close();
  }
});
