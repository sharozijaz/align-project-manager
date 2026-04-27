import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectForm } from "../components/projects/ProjectForm";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";

export function Projects() {
  const [creating, setCreating] = useState(false);
  const { projects, addProject, updateProject, deleteProject } = useProjectStore();
  const { tasks } = useTaskStore();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Group related tasks, track status, and keep active work easy to scan."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            New Project
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            tasks={tasks.filter((task) => !task.deletedAt)}
            onUpdate={updateProject}
            onDelete={(projectId) => {
              const project = projects.find((item) => item.id === projectId);
              if (window.confirm(`Delete "${project?.name ?? "this project"}"? Tasks will stay in your workspace.`)) {
                deleteProject(projectId);
              }
            }}
          />
        ))}
      </div>
      {!projects.length ? <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/70 p-10 text-center text-sm text-slate-400">Create your first project to start grouping tasks.</div> : null}
      <Modal title="Create project" open={creating} onClose={() => setCreating(false)}>
        <ProjectForm
          onSubmit={(input) => {
            addProject(input);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}
