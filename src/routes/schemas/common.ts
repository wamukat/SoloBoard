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
