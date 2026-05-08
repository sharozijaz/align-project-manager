import { CheckCircle2, FolderPlus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appNavigationItems } from "./AppSidebar";
import { ProjectForm } from "../projects/ProjectForm";
import { TaskForm } from "../tasks/TaskForm";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useFeatureAccess } from "../../features/access/FeatureAccessProvider";
import type { FeatureKey } from "../../features/access/featureRegistry";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";

type Dialog = "command" | "help" | "task" | "project" | null;

const shortcutRows = [
  ["Ctrl K", "Open command palette"],
  ["N", "Create a task"],
  ["P", "Create a project"],
  ["G H", "Go to Home"],
  ["G P", "Go to Projects"],
  ["G T", "Go to Tasks"],
  ["G C", "Go to Calendar"],
  ["G R", "Go to Reports"],
  ["?", "Show keyboard shortcuts"],
];

export function AppShortcuts() {
  const navigate = useNavigate();
  const { access, hasFeature } = useFeatureAccess();
  const { projects, addProject } = useProjectStore();
  const addTask = useTaskStore((state) => state.addTask);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [goChordActive, setGoChordActive] = useState(false);

  const commandItems = useMemo(
    () =>
      appNavigationItems
        .filter((item) => {
          if (item.ownerOnly && access?.profile.role !== "owner") return false;
          return item.feature ? hasFeature(item.feature as FeatureKey) : true;
        })
        .filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(commandQuery.trim().toLowerCase())),
    [access?.profile.role, commandQuery, hasFeature],
  );

  useEffect(() => {
    const openShortcuts = () => setDialog("help");
    window.addEventListener("align:open-shortcuts", openShortcuts);
    return () => window.removeEventListener("align:open-shortcuts", openShortcuts);
  }, []);

  useEffect(() => {
    if (!goChordActive) return;
    const timeout = window.setTimeout(() => setGoChordActive(false), 900);
    return () => window.clearTimeout(timeout);
  }, [goChordActive]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        setDialog(null);
        setGoChordActive(false);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog("command");
        setCommandQuery("");
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setDialog("help");
        return;
      }

      if (goChordActive) {
        const route = routeFromGoKey(event.key.toLowerCase());
        if (route) {
          event.preventDefault();
          navigate(route);
          setGoChordActive(false);
        }
        return;
      }

      if (event.key.toLowerCase() === "g") {
        setGoChordActive(true);
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setDialog("task");
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        setDialog("project");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goChordActive, navigate]);

  const close = () => setDialog(null);

  return (
    <>
      {goChordActive && !dialog ? (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] shadow-[var(--shadow-md)]">
          Go to: H home, P projects, T tasks, C calendar, R reports
        </div>
      ) : null}

      <Modal title="Command palette" open={dialog === "command"} onClose={close}>
        <div className="space-y-4">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <Input
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search pages and actions..."
              className="pl-10"
              autoFocus
            />
          </label>
          <div className="grid gap-2">
            <button
              type="button"
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                setDialog("task");
              }}
            >
              <CheckCircle2 size={17} />
              <span className="font-semibold text-[var(--text)]">New task</span>
              <span className="ml-auto rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)]">N</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                setDialog("project");
              }}
            >
              <FolderPlus size={17} />
              <span className="font-semibold text-[var(--text)]">New project</span>
              <span className="ml-auto rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)]">P</span>
            </button>
            {commandItems.map(({ to, label, hint, icon: Icon }) => (
              <button
                key={to}
                type="button"
                className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  navigate(to);
                  close();
                }}
              >
                <Icon size={17} />
                <span className="font-semibold text-[var(--text)]">{label}</span>
                {hint ? <span className="ml-auto rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)]">{hint}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal title="Keyboard shortcuts" open={dialog === "help"} onClose={close}>
        <div className="grid gap-2">
          {shortcutRows.map(([keys, description]) => (
            <div key={keys} className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <span className="text-sm text-[var(--text-muted)]">{description}</span>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-bold text-[var(--text)]">{keys}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal title="Create task" open={dialog === "task"} onClose={close}>
        <TaskForm
          projects={projects.filter((project) => !project.deletedAt)}
          onSubmit={(input) => {
            addTask(input);
            close();
          }}
          onCancel={close}
        />
      </Modal>

      <Modal title="Create project" open={dialog === "project"} onClose={close}>
        <ProjectForm
          onSubmit={(input) => {
            addProject(input);
            close();
          }}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

function routeFromGoKey(key: string) {
  if (key === "h") return "/";
  if (key === "p") return "/projects";
  if (key === "t") return "/tasks";
  if (key === "c") return "/calendar";
  if (key === "r") return "/reports";
  if (key === "u") return "/hub";
  return "";
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
