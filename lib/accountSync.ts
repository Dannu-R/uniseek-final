// Keeps the browser's copy of a student's dashboard data in step with their account
// (/api/account), so their answers, saved colleges and recommended list follow them to
// any browser. Browser-only.
//
// The dashboard works off local/session storage as before. What changes:
// - loadAccount() runs before the dashboard renders and replaces the browser's copy with
//   the account's. (The one exception is the first visit after accounts started keeping
//   this data: then whatever this browser already had is uploaded instead, so nobody
//   loses their work.)
// - pushAnswers / pushSaved send each change back to the account.

const ANSWERS_KEY = "uniseek.profile.v1";
const STEP_KEY = "uniseek.step.v1";
const SAVED_KEY = "uniseek.saved.v1";
const RESULT_KEY = "uniseek.result.v1";
// Which account the browser's copy belongs to, so a second person signing in on the same
// browser never sees (or uploads) the first person's data.
const OWNER_KEY = "uniseek.owner.v1";

type AccountState = {
  userId: string;
  answers: { data: unknown; step: number } | null;
  saved: unknown[];
  run: unknown | null;
};

function put(body: Record<string, unknown>) {
  return fetch("/api/account", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true, // still sent if the tab is closing
  }).catch(() => {
    /* offline: the browser copy is still saved, and the next change resends it */
  });
}

function readJson(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeOrRemove(storage: Storage, key: string, value: string | null) {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}

export async function loadAccount(): Promise<void> {
  // Don't hold the dashboard up for long if the server is slow: fall back to the
  // browser's copy.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let account: AccountState;
  try {
    const res = await fetch("/api/account", { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return;
    account = (await res.json()) as AccountState;
  } catch {
    return;
  } finally {
    clearTimeout(timeout);
  }

  try {
    const owner = localStorage.getItem(OWNER_KEY);
    const accountEmpty = !account.answers && account.saved.length === 0 && !account.run;

    if (accountEmpty && owner === null) {
      // First visit since accounts kept this data: adopt what this browser already has.
      const answers = readJson(localStorage, ANSWERS_KEY);
      const saved = readJson(localStorage, SAVED_KEY);
      const run = readJson(sessionStorage, RESULT_KEY);
      const body: Record<string, unknown> = {};
      if (answers && typeof answers === "object") {
        body.answers = { data: answers, step: Number(localStorage.getItem(STEP_KEY)) || 0 };
      }
      if (Array.isArray(saved) && saved.length) body.saved = saved;
      if (run && typeof run === "object") body.run = run;
      if (Object.keys(body).length) await put(body);
    } else {
      // The account is the source of truth: replace the browser's copy with it.
      if (owner !== account.userId) {
        // A different person's cached analyses must not show up either.
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith("uniseek.insight.") || k.startsWith("uniseek.stats."))
          .forEach((k) => sessionStorage.removeItem(k));
      }
      writeOrRemove(localStorage, ANSWERS_KEY, account.answers ? JSON.stringify(account.answers.data) : null);
      writeOrRemove(localStorage, STEP_KEY, account.answers ? String(account.answers.step) : null);
      writeOrRemove(localStorage, SAVED_KEY, account.saved.length ? JSON.stringify(account.saved) : null);
      writeOrRemove(sessionStorage, RESULT_KEY, account.run ? JSON.stringify(account.run) : null);
    }
    localStorage.setItem(OWNER_KEY, account.userId);
  } catch {
    /* storage blocked: the dashboard just uses what it can */
  }
}

// Answers change on every keystroke, so wait for a pause before sending them.
let answersTimer: ReturnType<typeof setTimeout> | null = null;
export function pushAnswers(data: unknown, step: number) {
  if (answersTimer) clearTimeout(answersTimer);
  answersTimer = setTimeout(() => put({ answers: { data, step } }), 800);
}

export function pushSaved(saved: unknown[]) {
  put({ saved });
}

// "Clear recommendations": the list only.
export function clearAccountRun() {
  fetch("/api/account?part=run", { method: "DELETE" }).catch(() => {
    /* best-effort */
  });
}

// "Clear everything". Awaited, so a reload right after can't load the old data back.
export async function clearAccount() {
  if (answersTimer) clearTimeout(answersTimer);
  try {
    await fetch("/api/account", { method: "DELETE" });
  } catch {
    /* best-effort */
  }
}
