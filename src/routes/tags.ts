import type { FastifyInstance } from "fastify";

import type { KanbanDb } from "../db.js";
import type { Id } from "../types.js";

type TagRoutesSchemas = {
  errorSchema: unknown;
  idParamsSchema(key: string): unknown;
  tagCreateBodySchema: unknown;
  tagUpdateBodySchema: unknown;
  tagViewSchema: unknown;
  tagsResponseSchema: unknown;
};

type RegisterTagRoutesContext = {
  db: KanbanDb;
  getIdParam(params: unknown, key: string): Id;
  publishBoardEvent(boardId: Id, event?: string): void;
  schemas: TagRoutesSchemas;
};

export function registerTagRoutes(app: FastifyInstance, ctx: RegisterTagRoutesContext): void {
  const { db, getIdParam, publishBoardEvent, schemas } = ctx;

  app.get("/api/boards/:boardId/tags", {
    schema: {
      params: schemas.idParamsSchema("boardId"),
      response: {
        200: schemas.tagsResponseSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const boardId = getIdParam(request.params, "boardId");
    if (!db.getBoard(boardId)) {
      return reply.code(404).send({ error: "board not found" });
    }
    return { tags: db.listTags(boardId) };
  });

  app.post("/api/boards/:boardId/tags", {
    schema: {
      params: schemas.idParamsSchema("boardId"),
      body: schemas.tagCreateBodySchema,
      response: {
        201: schemas.tagViewSchema,
        400: schemas.errorSchema,
        404: schemas.errorSchema,
        409: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const boardId = getIdParam(request.params, "boardId");
    const body = request.body as { name?: string; color?: string };
    const name = body?.name?.trim();
    if (!db.getBoard(boardId)) {
      return reply.code(404).send({ error: "board not found" });
    }
    if (!name) {
      return reply.code(400).send({ error: "name is required" });
    }
    try {
      const tag = db.createTag({ boardId, name, color: body?.color?.trim() });
      publishBoardEvent(boardId);
      return reply.code(201).send(tag);
    } catch {
      return reply.code(409).send({ error: "tag already exists" });
    }
  });

  app.patch("/api/tags/:tagId", {
    schema: {
      params: schemas.idParamsSchema("tagId"),
      body: schemas.tagUpdateBodySchema,
      response: {
        200: schemas.tagViewSchema,
        400: schemas.errorSchema,
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const body = request.body as { name?: string; color?: string };
    try {
      const tag = db.updateTag(getIdParam(request.params, "tagId"), {
        name: body?.name?.trim(),
        color: body?.color?.trim(),
      });
      publishBoardEvent(tag.boardId);
      return tag;
    } catch {
      return reply.code(404).send({ error: "tag not found" });
    }
  });

  app.delete("/api/tags/:tagId", {
    schema: {
      params: schemas.idParamsSchema("tagId"),
      response: {
        204: { type: "null" },
        404: schemas.errorSchema,
      },
    },
  }, async (request, reply) => {
    const tagId = getIdParam(request.params, "tagId");
    const tag = db.getTag(tagId);
    if (!tag) {
      return reply.code(404).send({ error: "tag not found" });
    }
    try {
      db.deleteTag(tagId);
      publishBoardEvent(tag.boardId);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ error: "tag not found" });
    }
  });
}
