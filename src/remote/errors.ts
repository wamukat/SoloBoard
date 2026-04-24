export type RemoteErrorStatus = "auth_failed" | "permission_failed" | "not_found" | "rate_limited" | "error";

export function getRemoteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export function classifyRemoteError(message: string): RemoteErrorStatus {
  if (/\b401\b/i.test(message) || /bad credentials/i.test(message)) {
    return "auth_failed";
  }
  if (/\b403\b/i.test(message)) {
    return "permission_failed";
  }
  if (/\b404\b/i.test(message)) {
    return "not_found";
  }
  if (/\b429\b/i.test(message)) {
    return "rate_limited";
  }
  return "error";
}

export function sanitizeRemoteIssueLookupError(error: unknown, fallback: string): string {
  const message = getRemoteErrorMessage(error);
  if (/invalid url/i.test(message)) {
    return "invalid url";
  }
  if (/invalid .* issue url/i.test(message)) {
    return "invalid remote issue url";
  }
  if (/requires projectkey and issuekey/i.test(message)) {
    return "remote issue lookup requires project key and issue key";
  }
  return sanitizeRemoteProviderLookupStatusError(message, fallback);
}

export function sanitizeRemoteRefreshError(error: unknown): string {
  return sanitizeRemoteProviderLookupStatusError(getRemoteErrorMessage(error), "remote refresh failed");
}

export function humanizeRemoteDiagnosticError(message: string): string {
  switch (classifyRemoteError(message)) {
    case "auth_failed":
      return "Remote provider authentication failed. Check the configured token.";
    case "permission_failed":
      return "Remote provider credential does not have permission to read this issue.";
    case "not_found":
      return "Remote issue was not found or is not visible with the configured credential.";
    case "rate_limited":
      return "Remote provider rate limit was reached. Retry later.";
    default:
      return "Remote diagnostic failed. Check the provider URL, issue reference, and server logs.";
  }
}

export function sanitizeRemoteCommentPushError(message: string): string {
  switch (classifyRemoteError(message)) {
    case "auth_failed":
      return "Remote provider authentication failed. Check the configured token.";
    case "permission_failed":
      return "Remote provider credential does not have permission to post this comment.";
    case "not_found":
      return "Remote issue was not found or is not visible with the configured credential.";
    case "rate_limited":
      return "Remote provider rate limit was reached. Retry later.";
    default:
      return "Remote comment push failed. Check the provider URL, issue reference, permissions, and server logs.";
  }
}

function sanitizeRemoteProviderLookupStatusError(message: string, fallback: string): string {
  switch (classifyRemoteError(message)) {
    case "auth_failed":
      return "remote provider authentication failed";
    case "permission_failed":
      return "remote provider credential does not have permission";
    case "not_found":
      return "remote issue was not found";
    case "rate_limited":
      return "remote provider rate limit was reached";
    default:
      return fallback;
  }
}
