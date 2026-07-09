import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectForm } from "../projects/ProjectForm";
import { TaskForm } from "../tasks/TaskForm";
import { Modal } from "../ui/Modal";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";

type Dialog = "help" | "task" | "project" | null;

const shortcutRows = [
  ["Ctrl K", "Open command palette"],
  ["N", "Create a task"],
  ["P", "Create a project"],
  ["G H", "Go to Home"],
  ["G P", "Go to Projects"],
  ["G T", "Go to Tasks"],
  ["G I", "Go to Inbox"],
  ["G D", "Go to Docs"],
  ["G C", "Go to Calendar"],
  ["G R", "Go to Reports"],
  ["?", "Show keyboard shortcuts"],
];

export function AppShortcuts() {
  const navigate = useNavigate();
  const { projects, addProject } = useProjectStore();
  const addTask = useTaskStore((state) => state.addTask);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [goChordActive, setGoChordActive] = useState(false);

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
          Go to: H home, P projects, T tasks, I inbox, D docs, C calendar, R reports
        </div>
      ) : null}

      <Modal title="Keyboard shortcuts" description="Quick commands available across the workspace." open={dialog === "help"} onClose={close}>
        <div className="grid gap-2">
          {shortcutRows.map(([keys, description]) => (
            <div key={keys} className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <span className="text-sm text-[var(--text-muted)]">{description}</span>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-bold text-[var(--text)]">{keys}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal title="Create task" description="Add a task from anywhere in the app." open={dialog === "task"} onClose={close}>
        <TaskForm
          projects={projects.filter((project) => !project.deletedAt)}
          onSubmit={(input) => {
            addTask(input);
            close();
          }}
          onCancel={close}
        />
      </Modal>

      <Modal title="Create project" description="Start a project with the same project form used across Align." open={dialog === "project"} onClose={close}>
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
  if (key === "i") return "/todos";
  if (key === "d") return "/docs";
  if (key === "n") return "/docs";
  if (key === "c") return "/calendar";
  if (key === "r") return "/reports";
  if (key === "u") return "/resources";
  return "";
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
