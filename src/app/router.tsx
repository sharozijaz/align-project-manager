import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";

export const router = createBrowserRouter([
  {
    path: "/share/:token",
    lazy: async () => {
      const { PublicProjectShare } = await import("../pages/PublicProjectShare");
      return { Component: PublicProjectShare };
    },
  },
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { Dashboard } = await import("../pages/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "projects",
        lazy: async () => {
          const { Projects } = await import("../pages/Projects");
          return { Component: Projects };
        },
      },
      {
        path: "projects/:projectId",
        lazy: async () => {
          const { ProjectDetails } = await import("../pages/ProjectDetails");
          return { Component: ProjectDetails };
        },
      },
      {
        path: "tasks",
        lazy: async () => {
          const { Tasks } = await import("../pages/Tasks");
          return { Component: Tasks };
        },
      },
      {
        path: "calendar",
        lazy: async () => {
          const { Calendar } = await import("../pages/Calendar");
          return { Component: Calendar };
        },
      },
      {
        path: "reports",
        lazy: async () => {
          const { Reports } = await import("../pages/Reports");
          return { Component: Reports };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const { Settings } = await import("../pages/Settings");
          return { Component: Settings };
        },
      },
    ],
  },
]);
