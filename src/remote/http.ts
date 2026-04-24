export type RemoteFetchOptions = {
  providerLabel: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 100;

export async function fetchRemoteJson<T>(
  url: string,
  init: RequestInit = {},
  options: RemoteFetchOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, init, timeoutMs);
      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }
        return response.json() as Promise<T>;
      }
      const shouldRetry = isRetryableStatus(response.status) && attempt < maxRetries;
      if (shouldRetry) {
        await delay(retryDelayMs);
        continue;
      }
      const text = await response.text();
      throw new Error(`${options.providerLabel} request failed: ${response.status} ${text}`.trim());
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(`${options.providerLabel} request timed out after ${timeoutMs}ms`);
      }
      if (attempt < maxRetries && isRetryableFetchError(error)) {
        await delay(retryDelayMs);
        continue;
      }
      throw error;
    }
  }
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isRetryableFetchError(error: unknown): boolean {
  return error instanceof TypeError;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}
