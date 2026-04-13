export const positiveIntegerSchema = { type: "integer", minimum: 1 } as const;

export const optionalPositiveIntegerArraySchema = {
  type: "array",
  items: positiveIntegerSchema,
} as const;

export const errorSchema = {
  type: "object",
  required: ["error"],
  additionalProperties: false,
  properties: {
    error: { type: "string" },
  },
} as const;

export const boardViewSchema = {
  type: "object",
  required: ["id", "name", "position", "createdAt", "updatedAt"],
  additionalProperties: false,
  properties: {
    id: positiveIntegerSchema,
    name: { type: "string" },
    position: { type: "integer", minimum: 0 },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

export const laneViewSchema = {
  type: "object",
  required: ["id", "boardId", "name", "position"],
  additionalProperties: false,
  properties: {
    id: positiveIntegerSchema,
    boardId: positiveIntegerSchema,
    name: { type: "string" },
    position: { type: "integer", minimum: 0 },
  },
} as const;

export const tagViewSchema = {
  type: "object",
  required: ["id", "boardId", "name", "color"],
  additionalProperties: false,
  properties: {
    id: positiveIntegerSchema,
    boardId: positiveIntegerSchema,
    name: { type: "string" },
    color: { type: "string" },
  },
} as const;

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

export const boardsResponseSchema = {
  type: "object",
  required: ["boards"],
  additionalProperties: false,
  properties: {
    boards: {
      type: "array",
      items: boardViewSchema,
    },
  },
} as const;

export const lanesResponseSchema = {
  type: "object",
  required: ["lanes"],
  additionalProperties: false,
  properties: {
    lanes: {
      type: "array",
      items: laneViewSchema,
    },
  },
} as const;

export const tagsResponseSchema = {
  type: "object",
  required: ["tags"],
  additionalProperties: false,
  properties: {
    tags: {
      type: "array",
      items: tagViewSchema,
    },
  },
} as const;

export const boardShellResponseSchema = {
  type: "object",
  required: ["board", "lanes", "tags"],
  additionalProperties: false,
  properties: {
    board: boardViewSchema,
    lanes: {
      type: "array",
      items: laneViewSchema,
    },
    tags: {
      type: "array",
      items: tagViewSchema,
    },
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

export function idParamsSchema(key: string) {
  return {
    type: "object",
    required: [key],
    additionalProperties: false,
    properties: {
      [key]: positiveIntegerSchema,
    },
  } as const;
}

export const boardCreateBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    laneNames: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
} as const;

export const boardRenameBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
  },
} as const;

export const reorderBoardsBodySchema = {
  type: "object",
  required: ["boardIds"],
  additionalProperties: false,
  properties: {
    boardIds: optionalPositiveIntegerArraySchema,
  },
} as const;

export const laneBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
  },
} as const;

export const reorderLanesBodySchema = {
  type: "object",
  required: ["laneIds"],
  additionalProperties: false,
  properties: {
    laneIds: optionalPositiveIntegerArraySchema,
  },
} as const;

export const tagCreateBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    color: { type: "string" },
  },
} as const;

export const tagUpdateBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1 },
    color: { type: "string" },
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

