import { FormEvent, useEffect, useMemo, useState } from "react";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = "Pending" | "In Progress" | "Completed";
type Page = "dashboard" | "tasks";
type SortMode = "newest" | "oldest" | "due" | "priority";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  createdAt: number;
}

const DB_KEY = "taskflow_prototype";
const USERS_KEY = `${DB_KEY}_users`;
const TASKS_KEY = `${DB_KEY}_tasks`;
const SESSION_KEY = `${DB_KEY}_session`;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [users, setUsers] = useState<User[]>(() => readJSON(USERS_KEY, []));
  const [tasks, setTasks] = useState<Task[]>(() => readJSON(TASKS_KEY, []));
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() =>
    readJSON<SessionUser | null>(SESSION_KEY, null),
  );

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const emptyTask = {
    title: "",
    description: "",
    priority: "Medium" as Priority,
    status: "Pending" as TaskStatus,
    dueDate: "",
  };
  const [taskForm, setTaskForm] = useState(emptyTask);

  useEffect(() => localStorage.setItem(USERS_KEY, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => {
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [currentUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    const validUser = users.find((user) => user.id === currentUser.id);
    if (!validUser) setCurrentUser(null);
    else if (validUser.name !== currentUser.name || validUser.email !== currentUser.email) {
      setCurrentUser({ id: validUser.id, name: validUser.name, email: validUser.email });
    }
  }, [users, currentUser]);

  const myTasks = useMemo(
    () => (currentUser ? tasks.filter((task) => task.userId === currentUser.id) : []),
    [tasks, currentUser],
  );

  const filteredTasks = useMemo(() => {
    const list = myTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    return [...list].sort((a, b) => {
      if (sortMode === "newest") return b.createdAt - a.createdAt;
      if (sortMode === "oldest") return a.createdAt - b.createdAt;
      if (sortMode === "due") {
        return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      }
      return priorityRank[a.priority] - priorityRank[b.priority];
    });
  }, [myTasks, search, statusFilter, priorityFilter, sortMode]);

  const recentTasks = useMemo(
    () => [...myTasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [myTasks],
  );

  function signIn(user: User) {
    setCurrentUser({ id: user.id, name: user.name, email: user.email });
    setPage("dashboard");
    setToast(`Welcome, ${user.name.split(" ")[0]}.`);
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    if (users.some((user) => user.email === email)) {
      setToast("An account with this email already exists.");
      return;
    }
    const user: User = { id: crypto.randomUUID(), name, email, password: regPassword };
    setUsers((previous) => [...previous, user]);
    signIn(user);
    setRegName("");
    setRegEmail("");
    setRegPassword("");
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const user = users.find((item) => item.email === email && item.password === loginPassword);
    if (!user) {
      setToast("Invalid email or password.");
      return;
    }
    signIn(user);
    setLoginPassword("");
  }

  function logout() {
    setCurrentUser(null);
    setAuthMode("login");
    setLoginPassword("");
    setPage("dashboard");
  }

  function openCreateModal() {
    setEditingId(null);
    setTaskForm(emptyTask);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
    });
    setModalOpen(true);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    const title = taskForm.title.trim();
    if (!title) {
      setToast("Please enter a task title.");
      return;
    }

    if (editingId) {
      setTasks((previous) =>
        previous.map((task) =>
          task.id === editingId && task.userId === currentUser.id
            ? { ...task, ...taskForm, title, description: taskForm.description.trim() }
            : task,
        ),
      );
      setToast("Task updated successfully.");
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        ...taskForm,
        title,
        description: taskForm.description.trim(),
        createdAt: Date.now(),
      };
      setTasks((previous) => [...previous, newTask]);
      setToast("Task added successfully.");
    }
    setModalOpen(false);
    setEditingId(null);
    setTaskForm(emptyTask);
  }

  function toggleComplete(task: Task, checked: boolean) {
    const nextStatus: TaskStatus = checked ? "Completed" : "Pending";
    setTasks((previous) =>
      previous.map((item) =>
        item.id === task.id && item.userId === currentUser?.id
          ? { ...item, status: nextStatus }
          : item,
      ),
    );
    setToast(checked ? "Task completed." : "Task reopened.");
  }

  function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setTasks((previous) =>
      previous.filter((item) => !(item.id === task.id && item.userId === currentUser?.id)),
    );
    setToast("Task deleted.");
  }

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setSidebarOpen(false);
  }

  function formatDueDate(value: string) {
    if (!value) return "No due date";
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function TaskRow({ task }: { task: Task }) {
    return (
      <article className="task-row">
        <input
          className="task-check"
          type="checkbox"
          checked={task.status === "Completed"}
          onChange={(event) => toggleComplete(task, event.target.checked)}
          aria-label={`Mark ${task.title} completed`}
        />
        <div className="task-content">
          <div className={`task-title ${task.status === "Completed" ? "completed-title" : ""}`}>
            {task.title}
          </div>
          {task.description && <div className="task-description">{task.description}</div>}
          <div className="task-meta">
            <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority} Priority</span>
            <span className={`badge ${task.status.toLowerCase().replace(" ", "-")}`}>
              {task.status}
            </span>
            <span className="due">◷ {formatDueDate(task.dueDate)}</span>
          </div>
        </div>
        <div className="task-actions">
          <button className="icon-button" title="Edit task" aria-label="Edit task" onClick={() => openEditModal(task)}>✎</button>
          <button className="icon-button" title="Delete task" aria-label="Delete task" onClick={() => deleteTask(task)}>⌫</button>
        </div>
      </article>
    );
  }

  function EmptyState({ recent = false }: { recent?: boolean }) {
    return (
      <div className="empty">
        <div className="empty-icon">{recent ? "✦" : "⌕"}</div>
        <h3>{recent ? "Your task list is clear" : "No tasks found"}</h3>
        <p>{recent ? "Create your first task to get started." : "Try changing your filters or add a new task."}</p>
        <button className="btn btn-primary" onClick={openCreateModal}>＋ Add a Task</button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="brand"><div className="brand-icon">✓</div>TaskFlow</div>
          {authMode === "login" ? (
            <div>
              <h1>Welcome back</h1>
              <p className="subtitle">Sign in to organise your day.</p>
              <form onSubmit={handleLogin}>
                <div className="field">
                  <label htmlFor="loginEmail">Email address</label>
                  <input id="loginEmail" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="field">
                  <label htmlFor="loginPassword">Password</label>
                  <input id="loginPassword" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" required />
                </div>
                <button className="btn btn-primary btn-block" type="submit">Sign in</button>
              </form>
              <p className="auth-footer">New to TaskFlow? <button className="text-button" onClick={() => setAuthMode("register")}>Create an account</button></p>
            </div>
          ) : (
            <div>
              <h1>Create account</h1>
              <p className="subtitle">A clearer day starts with a plan.</p>
              <form onSubmit={handleRegister}>
                <div className="field">
                  <label htmlFor="regName">Full name</label>
                  <input id="regName" value={regName} onChange={(e) => setRegName(e.target.value)} maxLength={60} placeholder="Your name" required />
                </div>
                <div className="field">
                  <label htmlFor="regEmail">Email address</label>
                  <input id="regEmail" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="field">
                  <label htmlFor="regPassword">Password</label>
                  <input id="regPassword" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={4} placeholder="At least 4 characters" required />
                </div>
                <button className="btn btn-primary btn-block" type="submit">Create account</button>
              </form>
              <p className="auth-footer">Already registered? <button className="text-button" onClick={() => setAuthMode("login")}>Sign in</button></p>
            </div>
          )}
          <div className="demo-note">Frontend prototype. Accounts and tasks are stored locally in your browser. No backend connection is configured.</div>
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  const completedCount = myTasks.filter((task) => task.status === "Completed").length;
  const pendingCount = myTasks.filter((task) => task.status === "Pending").length;
  const progressCount = myTasks.filter((task) => task.status === "In Progress").length;

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-icon">✓</div>TaskFlow</div>
        <div className="nav-label">WORKSPACE</div>
        <button className={`nav ${page === "dashboard" ? "active" : ""}`} onClick={() => navigate("dashboard")}><span className="nav-icon">▦</span>Dashboard</button>
        <button className={`nav ${page === "tasks" ? "active" : ""}`} onClick={() => navigate("tasks")}><span className="nav-icon">☷</span>All Tasks</button>
        <button className="nav" onClick={openCreateModal}><span className="nav-icon">＋</span>Add a Task</button>
        <div className="sidebar-bottom">
          <div className="nav-label">ACCOUNT</div>
          <button className="nav" onClick={logout}><span className="nav-icon">↪</span>Log Out</button>
          <div className="profile">
            <div className="avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
            <div className="profile-details"><strong>{currentUser.name}</strong><small>{currentUser.email}</small></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</div>
            <h1>{page === "dashboard" ? "Dashboard" : "All Tasks"}</h1>
            <p className="welcome">{page === "dashboard" ? `Good to see you, ${currentUser.name.split(" ")[0]}. Here is your productivity overview.` : "Everything you need to get done, in one place."}</p>
          </div>
          <div className="top-actions">
            <button className="btn btn-secondary mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button>
            <button className="btn btn-primary" onClick={openCreateModal}>＋ New Task</button>
          </div>
        </header>

        {page === "dashboard" ? (
          <section>
            <div className="stats">
              <StatCard label="Total Tasks" value={myTasks.length} icon="☷" note="Tasks in workspace" />
              <StatCard label="Pending" value={pendingCount} icon="◷" note="Waiting to be started" />
              <StatCard label="In Progress" value={progressCount} icon="↗" note="Currently being worked on" />
              <StatCard label="Completed" value={completedCount} icon="✓" note="Successfully finished" />
            </div>
            <section className="panel">
              <div className="panel-header">
                <div><h2>Recent Tasks</h2><p>Your latest tasks at a glance.</p></div>
                <button className="btn btn-secondary" onClick={() => navigate("tasks")}>View All →</button>
              </div>
              <div className="task-list">
                {recentTasks.length ? recentTasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyState recent />}
              </div>
            </section>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <div><h2>Task List</h2><p>Search, filter and manage your tasks.</p></div>
              <span className="visible-count">{filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"}</span>
            </div>
            <div className="toolbar">
              <input aria-label="Search tasks by title" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="⌕ Search tasks by title..." />
              <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | TaskStatus)}>
                <option value="all">All Statuses</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option>
              </select>
              <select aria-label="Filter by priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as "all" | Priority)}>
                <option value="all">All Priorities</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
              </select>
              <select aria-label="Sort tasks" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                <option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="due">Due Date</option><option value="priority">Priority</option>
              </select>
            </div>
            <div className="task-list">
              {filteredTasks.length ? filteredTasks.map((task) => <TaskRow key={task.id} task={task} />) : <EmptyState />}
            </div>
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <div className="modal-header">
              <div><h2 id="modalTitle">{editingId ? "Edit Task" : "Create a Task"}</h2><p className="subtitle">Add details and set a priority.</p></div>
              <button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close dialog">✕</button>
            </div>
            <form onSubmit={saveTask}>
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="field wide">
                    <label htmlFor="taskTitle">Task Title *</label>
                    <input id="taskTitle" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} maxLength={100} required placeholder="e.g. Complete project report" />
                  </div>
                  <div className="field wide">
                    <label htmlFor="taskDescription">Description</label>
                    <textarea id="taskDescription" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} maxLength={500} placeholder="Add a few details..." />
                  </div>
                  <div className="field">
                    <label htmlFor="taskPriority">Priority</label>
                    <select id="taskPriority" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Priority })}>
                      <option>Medium</option><option>High</option><option>Low</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="taskStatus">Status</label>
                    <select id="taskStatus" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>
                      <option>Pending</option><option>In Progress</option><option>Completed</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="taskDue">Due Date</label>
                    <input id="taskDue" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">{editingId ? "Save Changes" : "Save Task"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function StatCard({ label, value, icon, note }: { label: string; value: number; icon: string; note: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span><span className="stat-icon">{icon}</span>
      <strong>{value}</strong><small>{note}</small>
    </div>
  );
}

export default App;
