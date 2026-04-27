import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { Dashboard } from "../pages/Dashboard";
import { Projects } from "../pages/Projects";
import { ProjectDetails } from "../pages/ProjectDetails";
import { Tasks } from "../pages/Tasks";
import { Calendar } from "../pages/Calendar";
import { Settings } from "../pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "projects", element: <Projects /> },
      { path: "projects/:projectId", element: <ProjectDetails /> },
      { path: "tasks", element: <Tasks /> },
      { path: "calendar", element: <Calendar /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
