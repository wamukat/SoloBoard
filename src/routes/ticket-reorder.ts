import type { FastifyInstance } from "fastify";

import type { RegisterTicketRoutesContext } from "./ticket-route-context.js";

export function registerTicketReorderRoutes(app: FastifyInstance, ctx: RegisterTicketRoutesContext): void {
  const { db, getIdParam, publishBoardEvent, schemas, serializeTicketSummaries } = ctx;

  app.post("/api/boards/:boardId/tickets/reorder", {
    schema: {
      params: schemas.idParamsSchema("boardId"),
      body: schemas.reorderTicketsBodySchema,
      response: {
        200: schemas.ticketsResponseSchema,
        400: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const boardId = getIdParam(request.params, "boardId");
    const body = request.body as {
      items?: Array<{ ticketId: number; laneId: number; position: number }>;
    };
    if (!Array.isArray(body?.items)) {
      return reply.code(400).send({ error: "items is required" });
    }
    try {
      const tickets = db.reorderTickets(boardId, body.items);
      publishBoardEvent(boardId);
      return { tickets: serializeTicketSummaries(tickets) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "ticket reorder failed";
      return reply.code(400).send({ error: message });
    }
  });
}
