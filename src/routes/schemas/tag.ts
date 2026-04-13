import { positiveIntegerSchema } from "./common.js";

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
