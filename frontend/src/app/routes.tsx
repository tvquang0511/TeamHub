import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";
import { WorkspaceListPage } from "./features/workspace/pages/WorkspaceListPage";
import { WorkspaceDetailPage } from "./features/workspace/pages/WorkspaceDetailPage";
import { BoardPage } from "./features/board/pages/BoardPage";
import { BoardSettingsPage } from "./features/board/pages/BoardSettingsPage";
import { AcceptInvitePage } from "./features/invites/pages/AcceptInvitePage";
import { CreateWorkspaceInvitePage } from "./features/invites/pages/CreateWorkspaceInvitePage";
import { CardDetailPage } from "./features/cards/pages/CardDetailPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProfilePage } from "./features/users/pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage,
  },
  {
    path: "/reset-password",
    Component: ResetPasswordPage,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      {
        path: "invites/:kind/:token/accept",
        Component: AcceptInvitePage,
      },
      {
        index: true,
        element: <Navigate to="/workspaces" replace />,
      },
      {
        path: "workspaces",
        Component: WorkspaceListPage,
      },
      {
        path: "workspaces/:workspaceId",
        Component: WorkspaceDetailPage,
      },
      {
        path: "workspaces/:workspaceId/invites/new",
        Component: CreateWorkspaceInvitePage,
      },
      {
        path: "boards/:boardId",
        Component: BoardPage,
      },
      {
        path: "boards/:boardId/settings",
        Component: BoardSettingsPage,
      },
      {
        path: "cards/:cardId",
        Component: CardDetailPage,
      },
      {
        path: "profile",
        Component: ProfilePage,
      },
    ],
  },
]);
