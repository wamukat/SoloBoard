export const positiveIntegerSchema = { type: "integer", minimum: 1 } as const;

export const ticketPrioritySchema = {
  type: "integer",
  enum: [1, 2, 3, 4],
  description: "Ticket priority. 1 = low, 2 = medium, 3 = high, 4 = urgent.",
} as const;

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
