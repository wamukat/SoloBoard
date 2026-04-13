import type { ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

import fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";

import { KanbanDb } from "./db.js";
import { registerBoardRoutes } from "./routes/boards.js";
import { registerLaneRoutes } from "./routes/lanes.js";
import * as routeSchemas from "./routes/schemas.js";
import {
  serializeBoardDetail,
  serializeTicket,
  serializeTicketRelation,
  serializeTicketSummaries,
} from "./routes/serializers.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerTagRoutes } from "./routes/tags.js";
import { registerTicketRoutes } from "./routes/tickets.js";
import { registerWebRoutes } from "./routes/web.js";
import { type Id } from "./types.js";

type BuildAppOptions = {
  dbFile: string;
  staticDir?: string;
};

type TicketMutationBody = {
  laneId?: number;
  parentTicketId?: number | null;
  title?: string;
  bodyMarkdown?: string;
  isResolved?: boolean;
  isCompleted?: boolean;
  isArchived?: boolean;
  priority?: number;
  tagIds?: number[];
  blockerIds?: number[] | null;
};

function readPackageMeta(): { name: string; version: string } {
  const fallback = { name: "SoloBoard", version: "0.0.0" };
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string };
    return {
      name: "SoloBoard",
      version: typeof parsed.version === "string" ? parsed.version : fallback.version,
    };
  } catch {
    return fallback;
  }
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = fastify({ logger: false, bodyLimit: 64 * 1024 * 1024 });
  const db = new KanbanDb(options.dbFile);
  const staticDir = options.staticDir ?? path.join(process.cwd(), "public");
  const appMeta = readPackageMeta();
  const boardEventClients = new Map<Id, Set<ServerResponse>>();

  function addBoardEventClient(boardId: Id, response: ServerResponse): void {
    const clients = boardEventClients.get(boardId) ?? new Set<ServerResponse>();
    clients.add(response);
    boardEventClients.set(boardId, clients);
  }

  function removeBoardEventClient(boardId: Id, response: ServerResponse): void {
    const clients = boardEventClients.get(boardId);
    if (!clients) {
      return;
    }
    clients.delete(response);
    if (clients.size === 0) {
      boardEventClients.delete(boardId);
    }
  }

  function publishBoardEvent(boardId: Id, event = "board_updated"): void {
    const clients = boardEventClients.get(boardId);
    if (!clients || clients.size === 0) {
      return;
    }
    const payload = `data: ${JSON.stringify({ boardId, event, sentAt: new Date().toISOString() })}\n\n`;
    for (const client of [...clients]) {
      if (client.destroyed || client.writableEnded) {
        removeBoardEventClient(boardId, client);
        continue;
      }
      client.write(payload);
    }
  }

  app.addHook("onClose", async () => {
    for (const clients of boardEventClients.values()) {
      for (const client of clients) {
        if (!client.destroyed && !client.writableEnded) {
          client.end();
        }
      }
    }
    boardEventClients.clear();
    db.close();
  });

  app.register(fastifyStatic, {
    root: staticDir,
    prefix: "/",
  });

  registerSystemRoutes(app, appMeta);
  registerBoardRoutes(app, {
    addBoardEventClient,
    db,
    getIdParam,
    publishBoardEvent,
    removeBoardEventClient,
    sanitizeStringArray,
    schemas: routeSchemas,
    serializeBoardDetail,
  });

  registerLaneRoutes(app, {
    db,
    getIdParam,
    publishBoardEvent,
    schemas: routeSchemas,
  });
  registerTagRoutes(app, {
    db,
    getIdParam,
    publishBoardEvent,
    schemas: routeSchemas,
  });

  registerTicketRoutes(app, {
    db,
    getIdParam,
    parseBooleanQuery,
    parseTicketMutationBody,
    publishBoardEvent,
    resolveResolvedFlag,
    schemas: routeSchemas,
    serializeTicket,
    serializeTicketRelation,
    serializeTicketSummaries,
  });

  registerWebRoutes(app);

  setErrorHandler(app);
  return app;
}

function setErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (reply.sent) {
      return;
    }
    if (error instanceof Error && typeof error === "object" && "validation" in error) {
      reply.code(400).send({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : "internal server error";
    reply.code(500).send({ error: message });
  });
}

function getIdParam(params: unknown, key: string): Id {
  const value = (params as Record<string, string | undefined>)[key];
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid ${key}`);
  }
  return parsed;
}

function sanitizeStringArray(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  const result = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function parseBooleanQuery(value: string | undefined): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function resolveResolvedFlag(body: { isResolved?: boolean; isCompleted?: boolean } | undefined): boolean | undefined {
  if (typeof body?.isResolved === "boolean") {
    return body.isResolved;
  }
  return body?.isCompleted;
}

function parseTicketMutationBody(body: TicketMutationBody): TicketMutationBody {
  const hasParentTicketId = Object.prototype.hasOwnProperty.call(body ?? {}, "parentTicketId");
  const hasBlockerIds = Object.prototype.hasOwnProperty.call(body ?? {}, "blockerIds");
  return {
    laneId: body?.laneId,
    parentTicketId: hasParentTicketId ? body?.parentTicketId ?? null : undefined,
    title: typeof body?.title === "string" ? body.title.trim() : undefined,
    bodyMarkdown: body?.bodyMarkdown,
    isResolved: resolveResolvedFlag(body),
    isCompleted: body?.isCompleted,
    isArchived: body?.isArchived,
    priority: typeof body?.priority === "number" ? body.priority : undefined,
    tagIds: Array.isArray(body?.tagIds) ? body.tagIds : undefined,
    blockerIds: hasBlockerIds ? (Array.isArray(body?.blockerIds) ? body.blockerIds : []) : undefined,
  };
}
