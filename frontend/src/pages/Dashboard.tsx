
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Legend, StatCard, StatusBar, TaskRow } from "../components";
import type { AiPlan, AiProvider, Task } from "../types";

type ProductivityInsights = {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completion_rate: number;
  insight: string;
  suggestions: string[];
  provider: AiProvider;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");

  // Plan my day
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planErr, setPlanErr] = useState("");
  const [provider] = useState<AiProvider>("gemini");

  const makePlan = async () => {
    setPlanBusy(true);
    setPlanErr("");

    try {
      setPlan(await api.aiPlan(provider));
    } catch (e) {
      setPlan(null);
      setPlanErr(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setPlanBusy(false);
    }
  };

  // AI Productivity Insights
  const [insights, setInsights] = useState<ProductivityInsights | null>(null);
  const [insightsBusy, setInsightsBusy] = useState(false);
  const [insightsErr, setInsightsErr] = useState("");

  const makeInsights = async () => {
    setInsightsBusy(true);
    setInsightsErr("");

    try {
      setInsights(await api.aiProductivityInsights());
    } catch (e) {
      setInsights(null);
      setInsightsErr(
        e instanceof Error ? e.message : "AI request failed."
      );
    } finally {
      setInsightsBusy(false);
    }
  };

  useEffect(() => {
    api.listTasks().then(setTasks).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!tasks) return <p className="muted">Loading your tasks…</p>;

  const count = (s: Task["status"]) =>
    tasks.filter((t) => t.status === s).length;

  const pending = count("pending");
  const progress = count("in_progress");
  const done = count("completed");

  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const recent = [...tasks]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <>
      <div className="stats">
        <StatCard
          label="Total Tasks"
          value={total}
          hint="Tasks in workspace"
          icon="☷"
        />
        <StatCard
          label="Pending"
          value={pending}
          hint="Waiting to be started"
          icon="◷"
        />
        <StatCard
          label="In Progress"
          value={progress}
          hint="Currently being worked on"
          icon="↗"
        />
        <StatCard
          label="Completed"
          value={done}
          hint="Successfully finished"
          icon="✓"
        />
      </div>

      {total > 0 && (
        <section className="panel panel-body" aria-label="Progress">
          <div className="progress-head">
            <span className="big">{pct}%</span>
            <span className="muted">
              {done} of {total} tasks completed
            </span>
          </div>

          <StatusBar
            pending={pending}
            in_progress={progress}
            completed={done}
          />

          <Legend
            pending={pending}
            in_progress={progress}
            completed={done}
          />
        </section>
      )}

      {/* Plan my day */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>✨ Plan my day</h2>
            <p>AI suggests what to do first from your open tasks.</p>
          </div>

          <div className="ai-row">
            <span className="ai-chip">Gemini</span>
            <button
              className="btn btn-primary"
              onClick={makePlan}
              disabled={planBusy || total - done === 0}
            >
              {planBusy ? "Thinking…" : "Plan my day"}
            </button>
          </div>
        </div>

        {planErr && (
          <div className="error" role="alert">{planErr}</div>
        )}

        {plan && (
          <div className="panel-body">
            <p className="ai-summary">
              {plan.summary}{" "}
              <span className="ai-chip">
                {plan.provider === "gemini" ? "Gemini" : "Grok"}
              </span>
            </p>

            <ol className="ai-plan">
              {plan.plan.map((p) => (
                <li key={p.task_id}>
                  <strong>{p.title}</strong>
                  <span className="muted"> — {p.reason}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* AI Productivity Insights */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>✨ AI Productivity Insights</h2>
            <p>
              Understand your productivity and discover ways to improve.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={makeInsights}
            disabled={insightsBusy}
          >
            {insightsBusy ? "Analyzing…" : "Analyze my productivity"}
          </button>
        </div>

        {insightsErr && (
          <div className="error" role="alert">
            {insightsErr}
          </div>
        )}

        {insights && (
          <div className="panel-body">
            <div className="stats">
             <StatCard
                label="Completion Rate"
                value={insights.completion_rate}
                hint="Percentage completed"
                icon="✓"
/>
  

              
              <StatCard
                label="Completed"
                value={insights.completed_tasks}
                hint="Finished tasks"
                icon="✓"
              />
              <StatCard
                label="Pending"
                value={insights.pending_tasks}
                hint="Waiting tasks"
                icon="◷"
              />
              <StatCard
                label="In Progress"
                value={insights.in_progress_tasks}
                hint="Active tasks"
                icon="↗"
              />
            </div>

            <p className="ai-summary">{insights.insight}</p>

            <h3>Suggestions for you</h3>

            <ul>
              {insights.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>

            <span className="ai-chip">Powered by Gemini</span>
          </div>
        )}
      </section>

      {/* Recent Tasks */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Tasks</h2>
            <p>Your latest tasks at a glance.</p>
          </div>

          <Link className="btn btn-secondary" to="/tasks">
            View All →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty">
            <h3>No tasks yet</h3>
            <Link to="/tasks?new=1">Add your first task</Link>
          </div>
        ) : (
          <div className="task-list">
            {recent.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
