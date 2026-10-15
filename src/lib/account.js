const SESSION_KEY = "oa-session";

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? "";
}

function headers() {
  const h = { "Content-Type": "application/json" };
  try {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) h.Authorization = `Bearer ${token}`;
  } catch { /* private mode */ }
  if (import.meta.env.VITE_INTERNAL_TOKEN) h["X-Internal-Token"] = import.meta.env.VITE_INTERNAL_TOKEN;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: headers(),
    signal: options.signal ?? AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function getSession() {
  let token = null;
  try { token = localStorage.getItem(SESSION_KEY); } catch { return null; }
  if (!token) return null;
  try {
    const { res, data } = await request("/auth/session");
    if (!res.ok || !data.user) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

export async function login(email, password) {
  let res;
  let data;
  try {
    ({ res, data } = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }));
  } catch {
    throw new Error("Could not reach sign-in");
  }
  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error || "Sign in failed");
  }
  localStorage.setItem(SESSION_KEY, data.token);
  return data.user;
}

export async function logout() {
  try { await request("/auth/logout", { method: "POST" }); } catch { /* drop local session anyway */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export async function listHistory() {
  try {
    const { res, data } = await request("/history");
    if (!res.ok) return null;
    return Array.isArray(data.entries) ? data.entries : null;
  } catch {
    return null;
  }
}

export async function insertHistory(entry) {
  try {
    const { res, data } = await request("/history", {
      method: "POST",
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    return data.entry ?? null;
  } catch {
    return null;
  }
}

export async function importHistory(entries) {
  try {
    const { res, data } = await request("/history/import", {
      method: "POST",
      body: JSON.stringify({
        entries: entries.map(h => ({
          ticker: h.ticker || "",
          strategy: h.strategy || "",
          strategyType: h.strategyType || "neutral",
          result: h.result ?? null,
          ts: h.ts,
        })),
      }),
    });
    if (!res.ok) return null;
    return Array.isArray(data.entries) ? data.entries : null;
  } catch {
    return null;
  }
}

export async function updateHistory(id, result) {
  if (!id) return false;
  try {
    const { res } = await request(`/history/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ result }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearRemoteHistory() {
  try {
    const { res } = await request("/history", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
