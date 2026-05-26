import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { ProjectDetail } from "../components/projects/ProjectDetail";
import { ProjectCollaboratorsPanel } from "../components/projects/ProjectCollaboratorsPanel";
import { ProjectSharePanel } from "../components/projects/ProjectSharePanel";
import { Button } from "../components/ui/Button";
import { collaboratorAssigneeOptions } from "../integrations/supabase/collaboration";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import type { ProjectCollaborator } from "../types/collaboration";

export function ProjectDetails() {
  const { projectId } = useParams();
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const { projects, updateProject } = useProjectStore();
  const { tasks, addTask, updateTask, deleteTask, completeTask, reorderTasks } = useTaskStore();
  const project = projects.find((item) => item.id === projectId);
  const assigneeOptions = useMemo(() => collaboratorAssigneeOptions(collaborators), [collaborators]);

  if (!project) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Project not found.</p>
        <Link to="/projects">
          <Button className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProjectDetail
        project={project}
        projects={projects}
        tasks={tasks.filter((task) => !task.deletedAt && task.projectId === project.id)}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onUpdateProject={updateProject}
        onDeleteTask={deleteTask}
        onCompleteTask={completeTask}
        onReorderTasks={reorderTasks}
        assigneeOptions={assigneeOptions}
      />
      <ProjectCollaboratorsPanel project={project} collaborators={collaborators} onChange={setCollaborators} />
      <ProjectSharePanel project={project} />
    </div>
  );
}
