type RemoteSnapshotFreshnessInput = {
  lastSyncedAt?: string | null;
  remoteUpdatedAt?: string | null;
};

export function getRemoteSnapshotFreshness(
  remote: RemoteSnapshotFreshnessInput | null | undefined,
  now?: number,
): {
  isStale: boolean;
  message: string;
};

export function buildBodyDiffRows(
  remoteMarkdown?: string,
  localMarkdown?: string,
): Array<{
  type: "same" | "remote" | "local";
  marker: " " | "-" | "+";
  text: string;
}>;
