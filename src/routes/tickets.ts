import type { FastifyInstance } from "fastify";

import { registerTicketActivityRoutes } from "./ticket-activity.js";
import { registerTicketBulkRoutes } from "./ticket-bulk.js";
import { registerTicketCommentRoutes } from "./ticket-comments.js";
import { registerTicketRelationRoutes } from "./ticket-relations.js";
import { registerTicketReorderRoutes } from "./ticket-reorder.js";
import type {
  RegisterTicketRoutesContext,
  TicketMutationBody,
  TicketTransitionBody,
} from "./ticket-route-context.js";

export function registerTicketRoutes(app: FastifyInstance, ctx: RegisterTicketRoutesContext): void {
  const {
    db,
    getIdParam,
    parseBooleanQuery,
    parseTicketMutationBody,
    publishBoardEvent,
    resolveResolvedFlag,
    schemas,
    serializeTicket,
    serializeTicketSummaries,
  } = ctx;

  app.get("/api/boards/:boardId/tickets", {
    schema: {
      params: schemas.idParamsSchema("boardId"),
      querystring: schemas.ticketListQuerySchema,
      response: {
        200: schemas.ticketsResponseSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const boardId = getIdParam(request.params, "boardId");
    if (!db.getBoard(boardId)) {
      return reply.code(404).send({ error: "board not found" });
    }
    const query = request.query as {
      lane_id?: string;
      tag?: string;
      resolved?: string;
      completed?: string;
      archived?: string;
      q?: string;
    };
    const resolvedFilter = parseBooleanQuery(query.resolved ?? query.completed);
    return {
      tickets: serializeTicketSummaries(db.listTicketSummaries(boardId, {
        laneId: query.lane_id ? Number(query.lane_id) : undefined,
        tag: query.tag?.trim() || undefined,
        resolved: resolvedFilter,
        archived:
          query.archived === "true" ? true : query.archived === "false" ? false : undefined,
        includeArchived: query.archived === "all",
        q: query.q?.trim() || undefined,
      })),
    };
  });

  app.post("/api/boards/:boardId/tickets", {
    schema: {
      params: schemas.idParamsSchema("boardId"),
      body: schemas.ticketCreateBodySchema,
      response: {
        201: {
          type: "object",
          additionalProperties: true,
        },
        400: schemas.errorSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const boardId = getIdParam(request.params, "boardId");
    const body = parseTicketMutationBody(request.body as TicketMutationBody);
    if (!db.getBoard(boardId)) {
      return reply.code(404).send({ error: "board not found" });
    }
    if (!body?.laneId || !body?.title?.trim()) {
      return reply.code(400).send({ error: "laneId and title are required" });
    }
    try {
      const ticket = db.createTicket({
        boardId,
        laneId: body.laneId,
        parentTicketId: body.parentTicketId ?? null,
        title: body.title.trim(),
        bodyMarkdown: body.bodyMarkdown ?? "",
        isResolved: Boolean(resolveResolvedFlag(body)),
        isArchived: Boolean(body.isArchived),
        priority: typeof body.priority === "number" ? body.priority : 2,
        tagIds: Array.isArray(body.tagIds) ? body.tagIds : [],
        blockerIds: Array.isArray(body.blockerIds) ? body.blockerIds : [],
      });
      publishBoardEvent(boardId);
      return reply.code(201).send(serializeTicket(ticket));
    } catch (error) {
      const message = error instanceof Error ? error.message : "ticket create failed";
      return reply.code(400).send({ error: message });
    }
  });

  app.get("/api/tickets/:ticketId", {
    schema: {
      params: schemas.idParamsSchema("ticketId"),
      response: {
        200: schemas.ticketSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const ticket = db.getTicket(getIdParam(request.params, "ticketId"));
    if (!ticket) {
      return reply.code(404).send({ error: "ticket not found" });
    }
    return serializeTicket(ticket);
  });

  app.patch("/api/tickets/:ticketId", {
    schema: {
      params: schemas.idParamsSchema("ticketId"),
      body: schemas.ticketUpdateBodySchema,
      response: {
        200: {
          type: "object",
          additionalProperties: true,
        },
        400: schemas.errorSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const body = parseTicketMutationBody(request.body as TicketMutationBody);
    try {
      const ticket = db.updateTicket(getIdParam(request.params, "ticketId"), {
        laneId: body.laneId,
        parentTicketId: body.parentTicketId,
        title: body.title?.trim(),
        bodyMarkdown: body.bodyMarkdown,
        isResolved: resolveResolvedFlag(body),
        isArchived: body.isArchived,
        priority: typeof body.priority === "number" ? body.priority : undefined,
        tagIds: Array.isArray(body.tagIds) ? body.tagIds : undefined,
        blockerIds: Array.isArray(body.blockerIds) ? body.blockerIds : undefined,
      });
      publishBoardEvent(ticket.boardId);
      return serializeTicket(ticket);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ticket update failed";
      const code = message === "Ticket not found" ? 404 : 400;
      return reply.code(code).send({ error: message.toLowerCase() });
    }
  });

  app.patch("/api/tickets/:ticketId/transition", {
    schema: {
      params: schemas.idParamsSchema("ticketId"),
      body: schemas.ticketTransitionBodySchema,
      response: {
        200: {
          type: "object",
          additionalProperties: true,
        },
        400: schemas.errorSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const body = request.body as TicketTransitionBody;
    const laneName = body?.laneName?.trim();
    if (!laneName) {
      return reply.code(400).send({ error: "lanename is required" });
    }
    try {
      const ticket = db.transitionTicket(
        getIdParam(request.params, "ticketId"),
        laneName,
        resolveResolvedFlag(body),
      );
      publishBoardEvent(ticket.boardId);
      return serializeTicket(ticket);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ticket transition failed";
      const code = message === "Ticket not found" ? 404 : 400;
      return reply.code(code).send({ error: message.toLowerCase() });
    }
  });

  app.delete("/api/tickets/:ticketId", {
    schema: {
      params: schemas.idParamsSchema("ticketId"),
      response: {
        204: { type: "null" },
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const ticketId = getIdParam(request.params, "ticketId");
    const ticket = db.getTicket(ticketId);
    if (!ticket) {
      return reply.code(404).send({ error: "ticket not found" });
    }
    try {
      db.deleteTicket(ticketId);
      publishBoardEvent(ticket.boardId);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ error: "ticket not found" });
    }
  });

  registerTicketBulkRoutes(app, ctx);
  registerTicketCommentRoutes(app, ctx);
  registerTicketActivityRoutes(app, ctx);
  registerTicketRelationRoutes(app, ctx);
  registerTicketReorderRoutes(app, ctx);
}
