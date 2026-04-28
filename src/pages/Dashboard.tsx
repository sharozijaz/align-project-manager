import { ActiveProjects } from "../components/dashboard/ActiveProjects";
import { Hero } from "../components/dashboard/Hero";
import { QuickAddTask } from "../components/dashboard/QuickAddTask";
import { StatsCards } from "../components/dashboard/StatsCards";
import { TodayTasks } from "../components/dashboard/TodayTasks";
import { UpcomingTasks } from "../components/dashboard/UpcomingTasks";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import { isTerminalTaskStatus } from "../config/taskOptions";
import { isOverdue, isToday } from "../utils/date";

export function Dashboard() {
  const { projects } = useProjectStore();
  const { tasks, addTask, updateTask, deleteTask, completeTask } = useTaskStore();
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const openTasks = activeTasks.filter((task) => !isTerminalTaskStatus(task.status));
  const todayTasks = openTasks.filter((task) => isToday(task.dueDate));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate));

  return (
    <div className="space-y-6">
      <Hero />
      <div className="mx-auto w-full space-y-6 px-1">
        <QuickAddTask projects={projects} onAdd={addTask} />
        <StatsCards open={openTasks.length} today={todayTasks.length} overdue={overdueTasks.length} />
        <div className="grid gap-6 xl:grid-cols-2">
          <TodayTasks tasks={[...todayTasks, ...overdueTasks]} projects={projects} onUpdate={updateTask} onDelete={deleteTask} onComplete={completeTask} />
          <UpcomingTasks tasks={activeTasks} projects={projects} />
        </div>
        <ActiveProjects projects={projects} tasks={activeTasks} />
      </div>
    </div>
  );
}
