import type { FastifyInstance } from "fastify";

import type { RegisterTicketRoutesContext } from "./ticket-route-context.js";

export function registerTicketActivityRoutes(app: FastifyInstance, ctx: RegisterTicketRoutesContext): void {
  const { db, getIdParam, schemas } = ctx;

  app.get("/api/tickets/:ticketId/activity", {
    schema: {
      params: schemas.idParamsSchema("ticketId"),
      response: {
        200: schemas.activityLogsResponseSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      return { activity: db.listActivity(getIdParam(request.params, "ticketId")) };
    } catch {
      return reply.code(404).send({ error: "ticket not found" });
    }
  });
}
