import type { FastifyInstance } from "fastify";

import { classifyRemoteError, humanizeRemoteDiagnosticError } from "../remote/errors.js";
import type { ConfiguredRemoteCredentialScope } from "../remote/credentials.js";
import type { RemoteAdapterRegistry } from "../remote/adapters.js";

type AppMeta = {
  name: string;
  version: string;
  remoteProviders: Array<{
    id: string;
    hasCredential: boolean;
  }>;
  remoteAdapters: RemoteAdapterRegistry;
  remoteCredentialScopes: ConfiguredRemoteCredentialScope[];
};

const healthResponseSchema = {
  type: "object",
  required: ["ok"],
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
  },
} as const;

const metaResponseSchema = {
  type: "object",
  required: ["name", "version", "remoteProviders"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    version: { type: "string" },
    remoteProviders: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "hasCredential"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          hasCredential: { type: "boolean" },
        },
      },
    },
  },
} as const;

const remoteProviderDiagnosticsResponseSchema = {
  type: "object",
  required: ["providers"],
  additionalProperties: false,
  properties: {
    providers: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "hasCredential", "status"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          hasCredential: { type: "boolean" },
          status: { type: "string", enum: ["configured", "missing_credential"] },
        },
      },
    },
  },
} as const;

const remoteDiagnosticBodySchema = {
  type: "object",
  required: ["provider"],
  additionalProperties: false,
  properties: {
    provider: { type: "string" },
    instanceUrl: { type: "string" },
    projectKey: { type: "string" },
    issueKey: { type: "string" },
    url: { type: "string" },
  },
} as const;

const remoteDiagnosticResponseSchema = {
  type: "object",
  required: ["provider", "hasCredential", "status"],
  additionalProperties: false,
  properties: {
    provider: { type: "string" },
    hasCredential: { type: "boolean" },
    status: {
      type: "string",
      enum: ["missing_credential", "reachable", "auth_failed", "permission_failed", "not_found", "rate_limited", "unsupported_provider", "error"],
    },
    displayRef: { type: "string" },
    url: { type: "string" },
    message: { type: "string" },
  },
} as const;

export function registerSystemRoutes(app: FastifyInstance, appMeta: AppMeta): void {
  app.get("/api/health", {
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
  }, async () => ({ ok: true }));

  app.get("/api/meta", {
    schema: {
      response: {
        200: metaResponseSchema,
      },
    },
  }, async () => ({
    name: appMeta.name,
    version: appMeta.version,
    remoteProviders: appMeta.remoteProviders,
  }));

  app.get("/api/remote-diagnostics", {
    schema: {
      response: {
        200: remoteProviderDiagnosticsResponseSchema,
      },
    },
  }, async () => ({
    providers: appMeta.remoteProviders.map((provider) => ({
      id: provider.id,
      hasCredential: provider.hasCredential,
      status: provider.hasCredential ? "configured" : "missing_credential",
    })),
  }));

  app.post("/api/remote-diagnostics", {
    schema: {
      body: remoteDiagnosticBodySchema,
      response: {
        200: remoteDiagnosticResponseSchema,
        400: remoteDiagnosticResponseSchema,
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      provider?: string;
      instanceUrl?: string;
      projectKey?: string;
      issueKey?: string;
      url?: string;
    };
    const provider = body.provider?.trim().toLowerCase() ?? "";
    const providerMeta = appMeta.remoteProviders.find((entry) => entry.id === provider);
    const hasCredential = Boolean(providerMeta?.hasCredential);
    if (!providerMeta || !appMeta.remoteAdapters[provider]) {
      return reply.code(400).send({
        provider,
        hasCredential: false,
        status: "unsupported_provider",
        message: "Unsupported remote provider",
      });
    }
    const targetInstanceUrl = getDiagnosticInstanceUrl(provider, body);
    if (!hasCredential || !targetInstanceUrl || !hasExactDiagnosticCredential(appMeta.remoteCredentialScopes, provider, targetInstanceUrl)) {
      return reply.code(400).send({
        provider,
        hasCredential,
        status: "missing_credential",
        message: "Exact remote provider credential is not configured for this diagnostic target",
      });
    }
    try {
      const snapshot = await appMeta.remoteAdapters[provider].fetchIssue({
        provider,
        instanceUrl: body.instanceUrl,
        projectKey: body.projectKey,
        issueKey: body.issueKey,
        url: body.url,
      });
      return {
        provider,
        hasCredential,
        status: "reachable",
        displayRef: snapshot.displayRef,
        url: snapshot.url,
        message: "Remote issue is reachable with the configured credential",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remote diagnostic failed";
      return reply.code(400).send({
        provider,
        hasCredential,
        status: classifyRemoteError(message),
        message: humanizeRemoteDiagnosticError(message),
      });
    }
  });
}

function hasExactDiagnosticCredential(
  scopes: ConfiguredRemoteCredentialScope[],
  provider: string,
  instanceUrl: string,
): boolean {
  return scopes.some((scope) => scope.provider === provider && !scope.wildcard && scope.instanceUrl === instanceUrl);
}

function getDiagnosticInstanceUrl(
  provider: string,
  input: { instanceUrl?: string; url?: string },
): string | null {
  try {
    if (input.url) {
      const url = new URL(input.url);
      if (provider === "redmine") {
        const match = url.pathname.match(/^(?<basePath>.*)\/issues\/[^/.]+(?:\.[a-z0-9]+)?\/?$/i);
        const basePath = match?.groups?.basePath ?? "";
        return joinOriginAndPath(url.origin, basePath);
      }
      return url.origin;
    }
    if (input.instanceUrl) {
      const url = new URL(input.instanceUrl);
      return provider === "redmine" ? joinOriginAndPath(url.origin, url.pathname) : url.origin;
    }
    if (provider === "github") {
      return "https://github.com";
    }
    if (provider === "gitlab") {
      return "https://gitlab.com";
    }
    return null;
  } catch {
    return null;
  }
}

function joinOriginAndPath(origin: string, pathname: string): string {
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  return `${origin}${normalizedPath}`;
}
