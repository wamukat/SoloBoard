import { positiveIntegerSchema } from "./common.js";

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
