import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AdminOnly, RequireFeature } from "../features/access/FeatureAccessProvider";

export const router = createBrowserRouter([
  {
    path: "/share/client/:token",
    lazy: async () => {
      const { PublicClientShare } = await import("../pages/PublicClientShare");
      return { Component: PublicClientShare };
    },
  },
  {
    path: "/share/client",
    lazy: async () => {
      const { PublicClientShare } = await import("../pages/PublicClientShare");
      return { Component: PublicClientShare };
    },
  },
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
          return { Component: () => <RequireFeature feature="project_management"><Dashboard /></RequireFeature> };
        },
      },
      {
        path: "projects",
        lazy: async () => {
          const { Projects } = await import("../pages/Projects");
          return { Component: () => <RequireFeature feature="project_management"><Projects /></RequireFeature> };
        },
      },
      {
        path: "projects/:projectId",
        lazy: async () => {
          const { ProjectDetails } = await import("../pages/ProjectDetails");
          return { Component: () => <RequireFeature feature="project_management"><ProjectDetails /></RequireFeature> };
        },
      },
      {
        path: "tasks",
        lazy: async () => {
          const { Tasks } = await import("../pages/Tasks");
          return { Component: () => <RequireFeature feature="project_management"><Tasks /></RequireFeature> };
        },
      },
      {
        path: "calendar",
        lazy: async () => {
          const { Calendar } = await import("../pages/Calendar");
          return { Component: () => <RequireFeature feature="project_management"><Calendar /></RequireFeature> };
        },
      },
      {
        path: "reports",
        lazy: async () => {
          const { Reports } = await import("../pages/Reports");
          return { Component: () => <RequireFeature feature="project_management"><Reports /></RequireFeature> };
        },
      },
      {
        path: "hub",
        lazy: async () => {
          const { PersonalHub } = await import("../pages/PersonalHub");
          return { Component: () => <RequireFeature feature="personal_hub"><PersonalHub /></RequireFeature> };
        },
      },
      {
        path: "help",
        lazy: async () => {
          const { Help } = await import("../pages/Help");
          return { Component: Help };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const { Settings } = await import("../pages/Settings");
          return { Component: Settings };
        },
      },
      {
        path: "admin",
        lazy: async () => {
          const { Admin } = await import("../pages/Admin");
          return { Component: () => <AdminOnly><Admin /></AdminOnly> };
        },
      },
    ],
  },
]);
