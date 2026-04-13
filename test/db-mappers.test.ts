import test from "node:test";
import assert from "node:assert/strict";

import { mapActivityLog, mapComment, sanitizePriority } from "../src/db-mappers.js";

test("mapComment renders markdown without changing persisted markdown", () => {
  const comment = mapComment({
    id: 1,
    ticket_id: 2,
    body_markdown: "Hello **SoloBoard**",
    created_at: "2026-04-13T00:00:00.000Z",
  });

  assert.equal(comment.bodyMarkdown, "Hello **SoloBoard**");
  assert.match(comment.bodyHtml, /<strong>SoloBoard<\/strong>/);
});

test("mapActivityLog tolerates invalid details json", () => {
  const activity = mapActivityLog({
    id: 1,
    board_id: 2,
    ticket_id: null,
    subject_ticket_id: 3,
    action: "ticket_deleted",
    message: "Ticket deleted",
    details_json: "{invalid",
    created_at: "2026-04-13T00:00:00.000Z",
  });

  assert.deepEqual(activity.details, {});
  assert.equal(activity.ticketId, null);
  assert.equal(activity.subjectTicketId, 3);
});

test("sanitizePriority normalizes invalid and decimal priorities", () => {
  assert.equal(sanitizePriority(undefined), 0);
  assert.equal(sanitizePriority(Number.NaN), 0);
  assert.equal(sanitizePriority(3.9), 3);
  assert.equal(sanitizePriority(-2.4), -2);
});
