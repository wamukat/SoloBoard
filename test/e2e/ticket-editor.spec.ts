import { expect, test } from "@playwright/test";

import { createBoard, createTicket, startTestApp } from "./helpers.js";

test("ticket editor creates updates archives restores and deletes tickets", async ({ page }) => {
  const { baseUrl, close } = await startTestApp(page);

  try {
    const boardPayload = await createBoard(page.request, baseUrl, {
      name: "Ticket Editor Board",
      laneNames: ["Todo", "Review"],
    });
    const [todoLane, reviewLane] = boardPayload.lanes;

    await page.goto(`${baseUrl}/boards/${boardPayload.board.id}`);
    const todoColumn = page.locator(".lane", { has: page.locator(".lane-title", { hasText: "Todo" }) });
    await todoColumn.getByRole("button", { name: "New ticket" }).click();
    await expect(page.locator("#editor-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#editor-form")).toBeVisible();
    await expect(page.locator("#ticket-resolved-row")).toBeHidden();

    await page.locator("#ticket-title").fill("Created from editor");
    await page.locator("#ticket-body").fill("Created with **Markdown**");
    await page.locator("#ticket-priority").fill("4");
    await page.locator("#ticket-lane").selectOption(String(reviewLane.id));
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/boards/${boardPayload.board.id}/tickets`) &&
        response.request().method() === "POST",
    );
    await page.locator("#save-ticket-button").click();
    const createdTicketResponse = await createResponse;
    expect(createdTicketResponse.status()).toBe(201);
    const createdTicket = await createdTicketResponse.json();
    await expect(page.locator("#editor-dialog")).not.toHaveJSProperty("open", true);
    await expect(page.locator(".lane", { has: page.locator(".lane-title", { hasText: "Review" }) })).toContainText("Created from editor");

    await page.getByRole("button", { name: "Created from editor" }).click();
    await expect(page.locator("#editor-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#ticket-view")).toContainText("Created with Markdown");
    await page.locator("#header-edit-button").click();
    await page.locator("#ticket-title").fill("Updated from editor");
    await page.locator("#ticket-priority").fill("7");
    await page.locator("#ticket-resolved-row").click();
    await page.locator("#ticket-lane").selectOption(String(todoLane.id));
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/tickets/${createdTicket.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.locator("#save-ticket-button").click();
    expect((await updateResponse).status()).toBe(200);
    await expect(page.locator("#ticket-view")).toBeVisible();
    await expect(page.locator("#editor-header-title")).toHaveText("Updated from editor");
    await expect(page.locator("#editor-header-state")).toContainText("Resolved");
    await expect(page.locator("#ticket-view-meta")).toContainText("Priority: 7");

    await page.locator("#header-edit-button").click();
    const archiveResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/tickets/${createdTicket.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.locator("#archive-ticket-button").click();
    expect((await archiveResponse).status()).toBe(200);
    await expect(page.locator("#editor-dialog")).not.toHaveJSProperty("open", true);
    await expect(page.getByRole("button", { name: "Updated from editor" })).toHaveCount(0);

    await page.locator("#resolved-filter [data-value='']").click();
    await page.locator("#archived-filter-button").click();
    await page.getByRole("button", { name: "Updated from editor" }).click();
    await page.locator("#header-edit-button").click();
    await expect(page.locator("#archive-ticket-button")).toContainText("Restore");
    const restoreResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/tickets/${createdTicket.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.locator("#archive-ticket-button").click();
    expect((await restoreResponse).status()).toBe(200);
    await expect(page.locator("#editor-form")).toBeVisible();
    await expect(page.locator("#archive-ticket-button")).toContainText("Archive");

    const deleteCandidate = await createTicket(page.request, baseUrl, boardPayload.board.id, {
      laneId: todoLane.id,
      title: "Delete from editor",
    });
    await page.goto(`${baseUrl}/tickets/${deleteCandidate.id}`);
    await expect(page.locator("#editor-dialog")).toHaveJSProperty("open", true);
    await page.locator("#header-edit-button").click();
    await page.locator("#delete-ticket-button").click();
    await expect(page.locator("#ux-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#ux-submit-button")).toHaveText("Delete");
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/tickets/${deleteCandidate.id}`) &&
        response.request().method() === "DELETE",
    );
    await page.locator("#ux-submit-button").click();
    expect((await deleteResponse).status()).toBe(204);
    await expect(page.locator("#editor-dialog")).not.toHaveJSProperty("open", true);
  } finally {
    await close();
  }
});
