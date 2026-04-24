import test from "node:test";
import assert from "node:assert/strict";

import { EnvRemoteCredentialResolver, parseCredentialMap } from "../src/remote/credentials.js";
import { GithubIssueAdapter } from "../src/remote/github-adapter.js";
import { GitlabIssueAdapter } from "../src/remote/gitlab-adapter.js";
import { fetchRemoteJson } from "../src/remote/http.js";
import { RedmineIssueAdapter } from "../src/remote/redmine-adapter.js";

test("env remote credential resolver reads exact and wildcard scoped credentials", () => {
  const resolver = new EnvRemoteCredentialResolver({
    KANBALONE_REMOTE_CREDENTIALS: JSON.stringify({
      "github:https://github.com": { type: "token", token: "github-token" },
      "redmine:*": "redmine-token",
    }),
  });

  assert.deepEqual(resolver.getCredential({ provider: "github", instanceUrl: "https://github.com/acme/repo" }), {
    type: "token",
    token: "github-token",
  });
  assert.deepEqual(resolver.getCredential({ provider: "redmine", instanceUrl: "https://redmine.example.test" }), {
    type: "token",
    token: "redmine-token",
  });
  assert.equal(resolver.getCredential({ provider: "jira", instanceUrl: "https://jira.example.test" }), null);
});

test("env remote credential resolver preserves Redmine subpath scopes", () => {
  const resolver = new EnvRemoteCredentialResolver({
    KANBALONE_REMOTE_CREDENTIALS: JSON.stringify({
      "redmine:https://redmine.example.test/redmine": "redmine-subpath-token",
      "github:https://github.com/acme/repo": "github-origin-token",
      "gitlab:https://gitlab.example.test/group/project": "gitlab-origin-token",
    }),
  });

  assert.deepEqual(resolver.getCredential({ provider: "redmine", instanceUrl: "https://redmine.example.test/redmine" }), {
    type: "token",
    token: "redmine-subpath-token",
  });
  assert.equal(resolver.getCredential({ provider: "redmine", instanceUrl: "https://redmine.example.test/other" }), null);
  assert.deepEqual(resolver.getCredential({ provider: "github", instanceUrl: "https://github.com" }), {
    type: "token",
    token: "github-origin-token",
  });
  assert.deepEqual(resolver.getCredential({ provider: "gitlab", instanceUrl: "https://gitlab.example.test" }), {
    type: "token",
    token: "gitlab-origin-token",
  });
});

test("remote credential scopes preserve Redmine paths and keep GitHub and GitLab origins", async () => {
  const { getConfiguredCredentialScopes } = await import("../src/remote/credentials.js");
  assert.deepEqual(
    getConfiguredCredentialScopes({
      KANBALONE_REMOTE_CREDENTIALS: JSON.stringify({
        "redmine:https://redmine.example.test/redmine/": "redmine-token",
        "github:https://github.com/acme/repo": "github-token",
        "gitlab:https://gitlab.example.test/group/project": "gitlab-token",
      }),
    }),
    [
      { provider: "redmine", instanceUrl: "https://redmine.example.test/redmine", wildcard: false },
      { provider: "github", instanceUrl: "https://github.com", wildcard: false },
      { provider: "gitlab", instanceUrl: "https://gitlab.example.test", wildcard: false },
    ],
  );
});

test("remote credentials do not use GitHub or GitLab wildcard tokens for arbitrary origins", async () => {
  const { getConfiguredCredentialProviders } = await import("../src/remote/credentials.js");
  const env = {
    KANBALONE_REMOTE_CREDENTIALS: JSON.stringify({
      "github:*": "github-wildcard-token",
      "gitlab:*": "gitlab-wildcard-token",
      "redmine:*": "redmine-wildcard-token",
    }),
  };
  const resolver = new EnvRemoteCredentialResolver(env);

  assert.equal(resolver.getCredential({ provider: "github", instanceUrl: "https://github.example.test" }), null);
  assert.equal(resolver.getCredential({ provider: "gitlab", instanceUrl: "https://gitlab.example.test" }), null);
  assert.deepEqual(resolver.getCredential({ provider: "redmine", instanceUrl: "https://redmine.example.test" }), {
    type: "token",
    token: "redmine-wildcard-token",
  });
  assert.deepEqual(getConfiguredCredentialProviders(env), ["redmine"]);
});

test("env remote credential resolver keeps GITHUB_TOKEN as a legacy fallback", () => {
  const resolver = new EnvRemoteCredentialResolver({
    GITHUB_TOKEN: "legacy-github-token",
  });

  assert.deepEqual(resolver.getCredential({ provider: "github", instanceUrl: "https://github.com" }), {
    type: "token",
    token: "legacy-github-token",
  });
  assert.equal(resolver.getCredential({ provider: "github", instanceUrl: "https://github.example.test" }), null);
  assert.equal(resolver.getCredential({ provider: "redmine", instanceUrl: "https://redmine.example.test" }), null);
});

test("remote credential map rejects malformed values", () => {
  assert.throws(() => parseCredentialMap("[]"), /must be a JSON object/);
  assert.throws(
    () =>
      parseCredentialMap(
        JSON.stringify({
          "github:https://github.com": { type: "basic", token: "token" },
        }),
      ),
    /must use type "token"/,
  );
  assert.throws(
    () =>
      parseCredentialMap(
        JSON.stringify({
          github: "token",
        }),
      ),
    /provider:instanceUrl/,
  );
});

test("remote fetch retries transient HTTP failures", async () => {
  let calls = 0;
  const result = await fetchRemoteJson<{ ok: boolean }>("https://remote.example.test/issues/1", {}, {
    providerLabel: "Remote",
    maxRetries: 1,
    retryDelayMs: 0,
    fetchImpl: (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("temporarily unavailable", { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 2);
});

test("remote fetch does not retry non-transient HTTP failures", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      fetchRemoteJson("https://remote.example.test/issues/1", {}, {
        providerLabel: "Remote",
        maxRetries: 2,
        retryDelayMs: 0,
        fetchImpl: (async () => {
          calls += 1;
          return new Response("bad token", { status: 401 });
        }) as typeof fetch,
      }),
    /Remote request failed: 401 bad token/,
  );

  assert.equal(calls, 1);
});

test("remote fetch applies request timeout", async () => {
  await assert.rejects(
    () =>
      fetchRemoteJson("https://remote.example.test/issues/1", {}, {
        providerLabel: "Remote",
        timeoutMs: 1,
        maxRetries: 0,
        fetchImpl: (async (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          })) as typeof fetch,
      }),
    /Remote request timed out after 1ms/,
  );
});

test("github adapter applies resolved token credentials to requests", async () => {
  const originalFetch = globalThis.fetch;
  let requestedAuthorization: string | null = null;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requestedAuthorization = new Headers(init?.headers).get("authorization");
    return new Response(
      JSON.stringify({
        number: 123,
        html_url: "https://github.com/acme/kanbalone/issues/123",
        title: "Remote issue",
        body: "Remote body",
        state: "open",
        updated_at: "2026-04-23T00:00:00.000Z",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GithubIssueAdapter({
      getCredential() {
        return { type: "token", token: "resolved-token" };
      },
    });
    const issue = await adapter.fetchIssue({ provider: "github", url: "https://github.com/acme/kanbalone/issues/123" });

    assert.equal(issue.displayRef, "acme/kanbalone#123");
    assert.equal(requestedAuthorization, "Bearer resolved-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("github adapter does not retry comment posts", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("created but response failed", { status: 503 });
  }) as typeof fetch;

  try {
    const adapter = new GithubIssueAdapter({
      getCredential() {
        return { type: "token", token: "resolved-token" };
      },
    });
    await assert.rejects(
      () =>
        adapter.postComment({
          ticketId: 1,
          provider: "github",
          instanceUrl: "https://github.com",
          resourceType: "issue",
          projectKey: "acme/kanbalone",
          issueKey: "123",
          displayRef: "acme/kanbalone#123",
          url: "https://github.com/acme/kanbalone/issues/123",
          title: "Remote issue",
          bodyMarkdown: "Remote body",
          bodyHtml: "<p>Remote body</p>",
          state: "open",
          remoteUpdatedAt: "2026-04-23T00:00:00.000Z",
          lastSyncedAt: "2026-04-23T00:00:01.000Z",
          createdAt: "2026-04-23T00:00:01.000Z",
          updatedAt: "2026-04-23T00:00:01.000Z",
        }, "Progress"),
      /GitHub request failed: 503 created but response failed/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gitlab adapter parses issue URLs and applies private-token credentials", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; token: string | null }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(input),
      token: new Headers(init?.headers).get("private-token"),
    });
    return new Response(
      JSON.stringify({
        iid: 7,
        web_url: "https://gitlab.example.test/team/kanbalone/-/issues/7",
        title: "GitLab issue",
        description: "Issue body",
        state: "opened",
        updated_at: "2026-04-24T00:00:00.000Z",
        references: {
          full: "team/kanbalone#7",
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GitlabIssueAdapter({
      getCredential() {
        return { type: "token", token: "gitlab-token" };
      },
    });
    const issue = await adapter.fetchIssue({
      provider: "gitlab",
      url: "https://gitlab.example.test/team/kanbalone/-/issues/7",
    });

    assert.equal(issue.displayRef, "team/kanbalone#7");
    assert.equal(issue.projectKey, "team/kanbalone");
    assert.equal(issue.issueKey, "7");
    assert.equal(requests[0]?.url, "https://gitlab.example.test/api/v4/projects/team%2Fkanbalone/issues/7");
    assert.equal(requests[0]?.token, "gitlab-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gitlab adapter parses terminal issues route when namespace contains issues segment", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        iid: 9,
        web_url: "https://gitlab.example.test/issues/platform/-/issues/9",
        title: "Nested issues namespace",
        description: "",
        state: "opened",
        updated_at: "2026-04-24T00:00:00.000Z",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GitlabIssueAdapter();
    const issue = await adapter.fetchIssue({
      provider: "gitlab",
      url: "https://gitlab.example.test/issues/platform/-/issues/9",
    });

    assert.equal(issue.projectKey, "issues/platform");
    assert.equal(issue.issueKey, "9");
    assert.equal(requestedUrl, "https://gitlab.example.test/api/v4/projects/issues%2Fplatform/issues/9");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gitlab adapter accepts work_items URLs returned by newer GitLab versions", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        iid: 1,
        web_url: "https://gitlab.example.test/root/kanbalone-sandbox/-/work_items/1",
        title: "Work item issue",
        description: "Body",
        state: "opened",
        updated_at: "2026-04-24T00:00:00.000Z",
        references: {
          full: "root/kanbalone-sandbox#1",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const adapter = new GitlabIssueAdapter();
    const issue = await adapter.fetchIssue({
      provider: "gitlab",
      url: "https://gitlab.example.test/root/kanbalone-sandbox/-/work_items/1",
    });

    assert.equal(issue.projectKey, "root/kanbalone-sandbox");
    assert.equal(issue.issueKey, "1");
    assert.equal(requestedUrl, "https://gitlab.example.test/api/v4/projects/root%2Fkanbalone-sandbox/issues/1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redmine adapter fetches issue snapshots and resolves pushed journal ids", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; apiKey: string | null; method: string }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({
      url,
      apiKey: new Headers(init?.headers).get("x-redmine-api-key"),
      method,
    });
    if (url.endsWith("/issues/42.json") && method === "PUT") {
      return new Response(null, { status: 204 });
    }
    if (url.endsWith("/issues/42.json")) {
      return new Response(
        JSON.stringify({
          issue: {
            id: 42,
            subject: "Redmine issue",
            description: "Redmine body",
            status: { name: "New" },
            updated_on: "2026-04-24T00:00:00Z",
            project: { id: 9, name: "Backend" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.endsWith("/issues/42.json?include=journals")) {
      return new Response(
        JSON.stringify({
          issue: {
            id: 42,
            subject: "Redmine issue",
            description: "Redmine body",
            status: { name: "In Progress" },
            updated_on: "2026-04-24T01:00:00Z",
            project: { id: 9, name: "Backend" },
            journals: [
              {
                id: 88,
                notes: "Progress from Kanbalone",
                created_on: "2026-04-24T01:00:00Z",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`Unexpected fetch request: ${url}`);
  }) as typeof fetch;

  try {
    const adapter = new RedmineIssueAdapter({
      getCredential() {
        return { type: "token", token: "redmine-token" };
      },
    });
    const issue = await adapter.fetchIssue({
      provider: "redmine",
      url: "https://redmine.example.test/issues/42",
    });
    assert.equal(issue.displayRef, "Backend #42");
    assert.equal(issue.projectKey, "9");
    assert.equal(issue.state, "New");

    const push = await adapter.postComment(
      {
        ticketId: 1,
        provider: "redmine",
        instanceUrl: "https://redmine.example.test",
        resourceType: "issue",
        projectKey: "9",
        issueKey: "42",
        displayRef: "Backend #42",
        url: "https://redmine.example.test/issues/42",
        title: "Redmine issue",
        bodyMarkdown: "Redmine body",
        bodyHtml: "<p>Redmine body</p>",
        state: "New",
        remoteUpdatedAt: "2026-04-24T00:00:00Z",
        lastSyncedAt: "2026-04-24T00:00:00Z",
        createdAt: "2026-04-24T00:00:00Z",
        updatedAt: "2026-04-24T00:00:00Z",
      },
      "Progress from Kanbalone",
    );
    assert.equal(push.remoteCommentId, "88");
    assert.equal(push.pushedAt, "2026-04-24T01:00:00Z");
    assert.deepEqual(
      requests.map((request) => ({ url: request.url, method: request.method, apiKey: request.apiKey })),
      [
        {
          url: "https://redmine.example.test/issues/42.json",
          method: "GET",
          apiKey: "redmine-token",
        },
        {
          url: "https://redmine.example.test/issues/42.json",
          method: "PUT",
          apiKey: "redmine-token",
        },
        {
          url: "https://redmine.example.test/issues/42.json?include=journals",
          method: "GET",
          apiKey: "redmine-token",
        },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redmine adapter preserves subpath instances in fetch and remote links", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        issue: {
          id: 42,
          subject: "Subpath issue",
          description: "Body",
          status: { name: "New" },
          updated_on: "2026-04-24T00:00:00Z",
          project: { id: 3, name: "Ops" },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const adapter = new RedmineIssueAdapter();
    const issue = await adapter.fetchIssue({
      provider: "redmine",
      url: "https://redmine.example.test/redmine/issues/42",
    });

    assert.equal(requestedUrl, "https://redmine.example.test/redmine/issues/42.json");
    assert.equal(issue.instanceUrl, "https://redmine.example.test/redmine");
    assert.equal(issue.url, "https://redmine.example.test/redmine/issues/42");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
