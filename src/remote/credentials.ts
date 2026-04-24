export type RemoteCredential = {
  type: "token";
  token: string;
};

export type RemoteCredentialScope = {
  provider: string;
  instanceUrl: string;
};

export type ConfiguredRemoteCredentialScope = {
  provider: string;
  instanceUrl: string;
  wildcard: boolean;
};

export interface RemoteCredentialResolver {
  getCredential(scope: RemoteCredentialScope): RemoteCredential | null | Promise<RemoteCredential | null>;
}

type CredentialEnvironment = Partial<Record<"GITHUB_TOKEN" | "KANBALONE_REMOTE_CREDENTIALS", string>>;

export class EnvRemoteCredentialResolver implements RemoteCredentialResolver {
  constructor(private readonly env: CredentialEnvironment = process.env) {}

  getCredential(scope: RemoteCredentialScope): RemoteCredential | null {
    const configured = this.getConfiguredCredential(scope);
    if (configured) {
      return configured;
    }
    if (
      normalizeProvider(scope.provider) === "github" &&
      normalizeInstanceUrl(scope.instanceUrl) === "https://github.com" &&
      this.env.GITHUB_TOKEN
    ) {
      return { type: "token", token: this.env.GITHUB_TOKEN };
    }
    return null;
  }

  private getConfiguredCredential(scope: RemoteCredentialScope): RemoteCredential | null {
    if (!this.env.KANBALONE_REMOTE_CREDENTIALS) {
      return null;
    }
    const parsed = parseCredentialMap(this.env.KANBALONE_REMOTE_CREDENTIALS);
    const provider = normalizeProvider(scope.provider);
    const instanceUrl = normalizeInstanceUrlForProvider(provider, scope.instanceUrl);
    return parsed.get(`${provider}:${instanceUrl}`) ?? getWildcardCredential(parsed, provider);
  }
}

export function parseCredentialMap(raw: string): Map<string, RemoteCredential> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("KANBALONE_REMOTE_CREDENTIALS must be a JSON object");
  }
  const credentials = new Map<string, RemoteCredential>();
  for (const [rawKey, rawValue] of Object.entries(parsed)) {
    const credential = parseCredentialValue(rawValue);
    if (!credential) {
      continue;
    }
    credentials.set(normalizeCredentialKey(rawKey), credential);
  }
  return credentials;
}

export function getConfiguredCredentialProviders(env: CredentialEnvironment = process.env): string[] {
  const providers = new Set<string>();
  if (env.KANBALONE_REMOTE_CREDENTIALS) {
    const parsed = parseCredentialMap(env.KANBALONE_REMOTE_CREDENTIALS);
    for (const key of parsed.keys()) {
      const separatorIndex = key.indexOf(":");
      if (separatorIndex > 0) {
        const provider = key.slice(0, separatorIndex);
        const instanceUrl = key.slice(separatorIndex + 1);
        if (instanceUrl !== "*" || allowsWildcardCredentialFallback(provider)) {
          providers.add(provider);
        }
      }
    }
  }
  if (env.GITHUB_TOKEN) {
    providers.add("github");
  }
  return [...providers].sort();
}

export function getConfiguredCredentialScopes(env: CredentialEnvironment = process.env): ConfiguredRemoteCredentialScope[] {
  const scopes: ConfiguredRemoteCredentialScope[] = [];
  if (env.KANBALONE_REMOTE_CREDENTIALS) {
    const parsed = JSON.parse(env.KANBALONE_REMOTE_CREDENTIALS) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (!parseCredentialValue(value)) {
        continue;
      }
      const separatorIndex = key.indexOf(":");
      if (separatorIndex > 0) {
        const provider = normalizeProvider(key.slice(0, separatorIndex));
        const instanceUrl = key.slice(separatorIndex + 1);
        scopes.push({
          provider,
          instanceUrl: instanceUrl === "*" ? "*" : normalizeInstanceUrlForProvider(provider, instanceUrl),
          wildcard: instanceUrl === "*",
        });
      }
    }
  }
  if (env.GITHUB_TOKEN) {
    scopes.push({ provider: "github", instanceUrl: "https://github.com", wildcard: false });
  }
  return scopes;
}

function parseCredentialValue(value: unknown): RemoteCredential | null {
  if (typeof value === "string") {
    return value ? { type: "token", token: value } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Remote credential values must be token strings or credential objects");
  }
  const credential = value as { type?: unknown; token?: unknown };
  if (credential.type !== "token" || typeof credential.token !== "string" || !credential.token) {
    throw new Error('Remote credential objects must use type "token" and a non-empty token');
  }
  return { type: "token", token: credential.token };
}

function normalizeCredentialKey(key: string): string {
  const [provider, ...instanceParts] = key.split(":");
  const instance = instanceParts.join(":");
  if (!provider || !instance) {
    throw new Error("Remote credential keys must use provider:instanceUrl");
  }
  const normalizedProvider = normalizeProvider(provider);
  return `${normalizedProvider}:${instance === "*" ? "*" : normalizeInstanceUrlForProvider(normalizedProvider, instance)}`;
}

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

function getWildcardCredential(credentials: Map<string, RemoteCredential>, provider: string): RemoteCredential | null {
  if (!allowsWildcardCredentialFallback(provider)) {
    return null;
  }
  return credentials.get(`${provider}:*`) ?? null;
}

function allowsWildcardCredentialFallback(provider: string): boolean {
  return provider !== "github" && provider !== "gitlab";
}

function normalizeInstanceUrl(instanceUrl: string): string {
  const url = new URL(instanceUrl);
  return url.origin;
}

function normalizeInstanceUrlForProvider(provider: string, instanceUrl: string): string {
  if (provider === "redmine") {
    return normalizeCredentialScopeInstanceUrl(instanceUrl);
  }
  return normalizeInstanceUrl(instanceUrl);
}

function normalizeCredentialScopeInstanceUrl(instanceUrl: string): string {
  const url = new URL(instanceUrl);
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}
