import type { AdminUser, AiParsedTask, AiPlan, AiProvider, Role, Status, Task, TaskInput } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";
const KEY = "taskly_token";

/** HTTP method the backend uses to update a task (Vaishnavi's API uses PUT; change here if the team switches to PATCH). */
const UPDATE_METHOD = "PUT";

/**
 * TEMPORARY dev shim: until the JWT login is merged, the task API needs ?user_id=.
 * Set VITE_DEV_USER_ID=2 in .env to test with the seed user. REMOVE once the backend reads the user from the token.
 */
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID as string | undefined;
const withDevUser = (path: string) =>
  DEV_USER_ID && path.startsWith("/api/tasks") ? `${path}${path.includes("?") ? "&" : "?"}user_id=${DEV_USER_ID}` : path;

export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ---- value mapping: backend says "InProgress", the UI uses "in_progress" ---- */
const STATUS_TO_API: Record<Status, string> = { pending: "Pending", in_progress: "InProgress", completed: "Completed" };

/** Accepts "InProgress", "in_progress", "In Progress", "in-progress" ... */
export function normStatus(s: unknown): Status {
  const k = String(s ?? "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[\s-]+/g, "_");
  return k === "in_progress" || k === "completed" ? k : "pending";
}
export const normRole = (r: unknown): Role => (String(r ?? "").toLowerCase() === "admin" ? "admin" : "user");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromApiTask = (t: any): Task => ({
  id: t.id, title: t.title, description: t.description ?? null,
  status: normStatus(t.status),
  priority: ["low", "medium", "high"].includes(String(t.priority).toLowerCase()) ? String(t.priority).toLowerCase() as Task["priority"] : "medium",
  due_date: t.due_date ?? null,
  created_at: t.created_at ?? "", // optional in the backend response
});
const toApiBody = (t: Partial<TaskInput>) => ({ ...t, ...(t.status ? { status: STATUS_TO_API[t.status] } : {}) });

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + withDevUser(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (res.status === 401 && token) { tokenStore.clear(); window.dispatchEvent(new Event("auth:expired")); }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const d = (await res.json()).detail;
      msg = typeof d === "string" ? d : Array.isArray(d) ? d.map((e) => e.msg).join(", ") : msg;
    } catch { /* keep default */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

type LoginResult = { access_token: string; name?: string; role?: string };
const jsonLogin = (path: string, email: string, password: string) =>
  req<LoginResult>(path, { method: "POST", body: JSON.stringify({ email, password }) });

export const api = {
  register: (name: string, email: string, password: string) =>
    req<unknown>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  // Backend login takes JSON {email, password} and returns {access_token, name, role}.
  login: (email: string, password: string) => jsonLogin("/api/auth/login", email, password),
  adminLogin: (email: string, password: string) => jsonLogin("/api/auth/admin/login", email, password),
  /** Who the token belongs to; the role here comes from the server, not from the browser. */
  me: () => req<{ id: number; name: string; email: string; role: string }>("/api/auth/me"),

  listTasks: async (p: { status?: string; q?: string; sort?: string } = {}) => {
    const qs = new URLSearchParams();
    if (p.status) qs.set("status", STATUS_TO_API[p.status as Status] ?? p.status);
    if (p.q) qs.set("q", p.q);
    qs.set("sort", "desc");
    return (await req<unknown[]>(`/api/tasks?${qs}`)).map(fromApiTask);
  },
  createTask: async (t: TaskInput) => fromApiTask(await req("/api/tasks", { method: "POST", body: JSON.stringify(toApiBody(t)) })),
  updateTask: async (id: number, t: Partial<TaskInput>) =>
    fromApiTask(await req(`/api/tasks/${id}`, { method: UPDATE_METHOD, body: JSON.stringify(toApiBody(t)) })),
  deleteTask: (id: number) => req<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  // AI features (Gemini / Grok). The API keys live only on the backend.
  aiParseTask: (text: string, provider?: AiProvider) =>
    req<AiParsedTask>("/api/ai/parse-task", { method: "POST", body: JSON.stringify({ text, provider }) }),
  aiPlan: (provider?: AiProvider) =>
    req<AiPlan>("/api/ai/plan", { method: "POST", body: JSON.stringify({ provider }) }),
  aiProductivityInsights: () =>
  req<{
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completion_rate: number;
    insight: string;
    suggestions: string[];
    provider: AiProvider;
  }>("/api/ai/productivity-insights", { method: "POST" }),
  // Admin-only (backend must return 403 for role=user)
  adminUsers: async (): Promise<AdminUser[]> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await req<any[]>("/api/admin/users")).map((u) => ({
      ...u, role: normRole(u.role), created_at: u.created_at ?? "",
      pending: u.pending ?? 0, in_progress: u.in_progress ?? 0, completed: u.completed ?? 0,
      total: u.total ?? (u.pending ?? 0) + (u.in_progress ?? 0) + (u.completed ?? 0),
    })),
  adminUserTasks: async (userId: number, status?: string) =>
    (await req<unknown[]>(`/api/admin/users/${userId}/tasks${status ? `?status=${STATUS_TO_API[status as Status] ?? status}` : ""}`)).map(fromApiTask),
};
