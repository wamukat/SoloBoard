import { optionalPositiveIntegerArraySchema, positiveIntegerSchema } from "./common.js";
import { tagViewSchema } from "./tag.js";

export const commentViewSchema = {
  type: "object",
  required: ["id", "ticketId", "bodyMarkdown", "bodyHtml", "createdAt"],
  additionalProperties: false,
  properties: {
    id: positiveIntegerSchema,
    ticketId: positiveIntegerSchema,
    bodyMarkdown: { type: "string" },
    bodyHtml: { type: "string" },
    createdAt: { type: "string" },
  },
} as const;

export const commentsResponseSchema = {
  type: "object",
  required: ["comments"],
  additionalProperties: false,
  properties: {
    comments: {
      type: "array",
      items: commentViewSchema,
    },
  },
} as const;

export const activityLogViewSchema = {
  type: "object",
  required: ["id", "boardId", "ticketId", "subjectTicketId", "action", "message", "details", "createdAt"],
  additionalProperties: false,
  properties: {
    id: positiveIntegerSchema,
    boardId: positiveIntegerSchema,
    ticketId: { anyOf: [positiveIntegerSchema, { type: "null" }] },
    subjectTicketId: positiveIntegerSchema,
    action: { type: "string" },
    message: { type: "string" },
    details: { type: "object", additionalProperties: true },
    createdAt: { type: "string" },
  },
} as const;

export const activityLogsResponseSchema = {
  type: "object",
  required: ["activity"],
  additionalProperties: false,
  properties: {
    activity: {
      type: "array",
      items: activityLogViewSchema,
    },
  },
} as const;

export const ticketRelationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "laneId", "isResolved", "isCompleted", "priority", "ref", "shortRef"],
  properties: {
    id: positiveIntegerSchema,
    title: { type: "string" },
    laneId: positiveIntegerSchema,
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
    priority: { type: "number" },
    ref: { type: "string" },
    shortRef: { type: "string" },
  },
} as const;

export const ticketRelationsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["parent", "children", "blockers", "blockedBy"],
  properties: {
    parent: { anyOf: [ticketRelationSchema, { type: "null" }] },
    children: {
      type: "array",
      items: ticketRelationSchema,
    },
    blockers: {
      type: "array",
      items: ticketRelationSchema,
    },
    blockedBy: {
      type: "array",
      items: ticketRelationSchema,
    },
  },
} as const;

export const ticketSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "boardId",
    "laneId",
    "parentTicketId",
    "title",
    "bodyMarkdown",
    "bodyHtml",
    "isResolved",
    "isCompleted",
    "isArchived",
    "priority",
    "position",
    "createdAt",
    "updatedAt",
    "tags",
    "comments",
    "blockerIds",
    "blockers",
    "blockedBy",
    "parent",
    "children",
    "ref",
    "shortRef",
  ],
  properties: {
    id: positiveIntegerSchema,
    boardId: positiveIntegerSchema,
    laneId: positiveIntegerSchema,
    parentTicketId: { anyOf: [positiveIntegerSchema, { type: "null" }] },
    title: { type: "string" },
    bodyMarkdown: { type: "string" },
    bodyHtml: { type: "string" },
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
    isArchived: { type: "boolean" },
    priority: { type: "number" },
    position: { type: "integer", minimum: 0 },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    tags: {
      type: "array",
      items: tagViewSchema,
    },
    comments: {
      type: "array",
      items: commentViewSchema,
    },
    blockerIds: {
      type: "array",
      items: positiveIntegerSchema,
    },
    blockers: {
      type: "array",
      items: ticketRelationSchema,
    },
    blockedBy: {
      type: "array",
      items: ticketRelationSchema,
    },
    parent: { anyOf: [ticketRelationSchema, { type: "null" }] },
    children: {
      type: "array",
      items: ticketRelationSchema,
    },
    ref: { type: "string" },
    shortRef: { type: "string" },
  },
} as const;

export const ticketSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "boardId",
    "laneId",
    "parentTicketId",
    "title",
    "isResolved",
    "isCompleted",
    "isArchived",
    "priority",
    "position",
    "createdAt",
    "updatedAt",
    "tags",
    "blockerIds",
    "ref",
    "shortRef",
  ],
  properties: {
    id: positiveIntegerSchema,
    boardId: positiveIntegerSchema,
    laneId: positiveIntegerSchema,
    parentTicketId: { anyOf: [positiveIntegerSchema, { type: "null" }] },
    title: { type: "string" },
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
    isArchived: { type: "boolean" },
    priority: { type: "number" },
    position: { type: "integer", minimum: 0 },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    tags: {
      type: "array",
      items: tagViewSchema,
    },
    blockerIds: {
      type: "array",
      items: positiveIntegerSchema,
    },
    ref: { type: "string" },
    shortRef: { type: "string" },
  },
} as const;

export const ticketsResponseSchema = {
  type: "object",
  required: ["tickets"],
  additionalProperties: false,
  properties: {
    tickets: {
      type: "array",
      items: ticketSummarySchema,
    },
  },
} as const;

export const ticketMutationBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    laneId: positiveIntegerSchema,
    parentTicketId: {
      anyOf: [positiveIntegerSchema, { type: "null" }],
    },
    title: { type: "string", minLength: 1 },
    bodyMarkdown: { type: "string" },
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
    isArchived: { type: "boolean" },
    priority: { type: "number" },
    tagIds: optionalPositiveIntegerArraySchema,
    blockerIds: {
      anyOf: [optionalPositiveIntegerArraySchema, { type: "null" }],
    },
  },
} as const;

export const ticketCreateBodySchema = {
  ...ticketMutationBodySchema,
  required: ["laneId", "title"],
} as const;

export const ticketUpdateBodySchema = {
  ...ticketMutationBodySchema,
  minProperties: 1,
} as const;

export const ticketTransitionBodySchema = {
  type: "object",
  required: ["laneName"],
  additionalProperties: false,
  properties: {
    laneName: { type: "string", minLength: 1 },
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
  },
} as const;

export const ticketCommentBodySchema = {
  type: "object",
  required: ["bodyMarkdown"],
  additionalProperties: false,
  properties: {
    bodyMarkdown: { type: "string", minLength: 1 },
  },
} as const;

export const ticketCommentUpdateBodySchema = {
  type: "object",
  required: ["bodyMarkdown"],
  additionalProperties: false,
  properties: {
    bodyMarkdown: { type: "string", minLength: 1 },
  },
} as const;

export const ticketListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    lane_id: positiveIntegerSchema,
    tag: { type: "string" },
    resolved: { type: "string", enum: ["true", "false"] },
    completed: { type: "string", enum: ["true", "false"] },
    archived: { type: "string", enum: ["true", "false", "all"] },
    q: { type: "string" },
  },
} as const;

export const reorderTicketsBodySchema = {
  type: "object",
  required: ["items"],
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["ticketId", "laneId", "position"],
        additionalProperties: false,
        properties: {
          ticketId: positiveIntegerSchema,
          laneId: positiveIntegerSchema,
          position: { type: "integer", minimum: 0 },
        },
      },
    },
  },
} as const;

export const bulkResolveTicketsBodySchema = {
  type: "object",
  required: ["ticketIds"],
  additionalProperties: false,
  properties: {
    ticketIds: optionalPositiveIntegerArraySchema,
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
  },
} as const;

export const bulkTransitionTicketsBodySchema = {
  type: "object",
  required: ["ticketIds", "laneName"],
  additionalProperties: false,
  properties: {
    ticketIds: optionalPositiveIntegerArraySchema,
    laneName: { type: "string", minLength: 1 },
    isResolved: { type: "boolean" },
    isCompleted: { type: "boolean" },
  },
} as const;

export const bulkArchiveTicketsBodySchema = {
  type: "object",
  required: ["ticketIds", "isArchived"],
  additionalProperties: false,
  properties: {
    ticketIds: optionalPositiveIntegerArraySchema,
    isArchived: { type: "boolean" },
  },
} as const;
