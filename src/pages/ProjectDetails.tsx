import { Link, useParams } from "react-router-dom";
import { ProjectDetail } from "../components/projects/ProjectDetail";
import { Button } from "../components/ui/Button";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";

export function ProjectDetails() {
  const { projectId } = useParams();
  const { projects } = useProjectStore();
  const { tasks, addTask, updateTask, deleteTask, completeTask } = useTaskStore();
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/75 p-8 text-center">
        <p className="text-sm text-slate-400">Project not found.</p>
        <Link to="/projects">
          <Button className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <ProjectDetail
      project={project}
      projects={projects}
      tasks={tasks.filter((task) => !task.deletedAt && task.projectId === project.id)}
      onAddTask={addTask}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
      onCompleteTask={completeTask}
    />
  );
}
