import { renderMarkdown } from "../markdown.js";
import type {
  ActivityLogRow,
  ActivityLogView,
  BoardRow,
  BoardView,
  CommentRow,
  CommentView,
  Id,
  LaneRow,
  LaneView,
  TagRow,
  TagView,
  TicketBlockerView,
  TicketRelationView,
  TicketRow,
  TicketSummaryView,
  TicketView,
} from "../types.js";

export function mapBoard(row: BoardRow): BoardView {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLane(row: LaneRow): LaneView {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    position: row.position,
  };
}

export function mapTag(row: TagRow): TagView {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    color: row.color,
  };
}

export function mapTicket(
  row: TicketRow,
  boardName: string,
  tags: TagView[],
  comments: CommentView[],
  blockers: TicketBlockerView[],
  blockedBy: TicketRelationView[],
  parent: TicketRelationView | null,
  children: TicketRelationView[],
): TicketView {
  return {
    id: row.id,
    boardId: row.board_id,
    laneId: row.lane_id,
    parentTicketId: row.parent_ticket_id,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    bodyHtml: renderMarkdown(row.body_markdown),
    isResolved: Boolean(row.is_resolved),
    isArchived: Boolean(row.is_archived),
    priority: row.priority,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    comments,
    blockerIds: blockers.map((blocker) => blocker.id),
    blockers,
    blockedBy,
    parent,
    children,
    ref: formatTicketRef(boardName, row.id),
    shortRef: formatShortRef(row.id),
  };
}

export function mapTicketSummary(
  row: TicketRow,
  boardName: string,
  tags: TagView[],
  blockerIds: Id[],
): TicketSummaryView {
  return {
    id: row.id,
    boardId: row.board_id,
    laneId: row.lane_id,
    parentTicketId: row.parent_ticket_id,
    title: row.title,
    isResolved: Boolean(row.is_resolved),
    isArchived: Boolean(row.is_archived),
    priority: row.priority,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    blockerIds,
    ref: formatTicketRef(boardName, row.id),
    shortRef: formatShortRef(row.id),
  };
}

export function mapComment(row: CommentRow): CommentView {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    bodyMarkdown: row.body_markdown,
    bodyHtml: renderMarkdown(row.body_markdown),
    createdAt: row.created_at,
  };
}

export function mapActivityLog(row: ActivityLogRow): ActivityLogView {
  let details: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.details_json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      details = parsed as Record<string, unknown>;
    }
  } catch {
    details = {};
  }
  return {
    id: row.id,
    boardId: row.board_id,
    ticketId: row.ticket_id,
    subjectTicketId: row.subject_ticket_id,
    action: row.action,
    message: row.message,
    details,
    createdAt: row.created_at,
  };
}

export function sanitizePriority(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.trunc(value);
}

export function mapRelation(
  row: {
    id: Id;
    title: string;
    lane_id: Id;
    is_resolved: number;
    priority: number;
  },
  boardName: string,
): TicketRelationView {
  return {
    id: row.id,
    title: row.title,
    laneId: row.lane_id,
    isResolved: Boolean(row.is_resolved),
    priority: row.priority,
    ref: formatTicketRef(boardName, row.id),
    shortRef: formatShortRef(row.id),
  };
}

function formatTicketRef(boardName: string, ticketId: Id): string {
  return `${boardName}#${ticketId}`;
}

function formatShortRef(ticketId: Id): string {
  return `#${ticketId}`;
}
