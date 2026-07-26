import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";
import { LandingPage } from "./features/landing/pages/LandingPage";
import { WorkspaceListPage } from "./features/workspace/pages/WorkspaceListPage";
import { WorkspaceDetailPage } from "./features/workspace/pages/WorkspaceDetailPage";
import { WorkspaceAnalyticsPage } from "./features/workspace/pages/WorkspaceAnalyticsPage";
import { BoardPage } from "./features/board/pages/BoardPage";
import { BoardSettingsPage } from "./features/board/pages/BoardSettingsPage";
import { BoardAnalyticsPage } from "./features/board/pages/BoardAnalyticsPage";
import { AcceptInvitePage } from "./features/invites/pages/AcceptInvitePage";
import { CreateWorkspaceInvitePage } from "./features/invites/pages/CreateWorkspaceInvitePage";
import { CardDetailPage } from "./features/cards/pages/CardDetailPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProfilePage } from "./features/users/pages/ProfilePage";
import { useAuth } from "./providers/AuthProvider";

const RootIndex: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-md" />
          <span className="text-xs font-medium text-muted-foreground animate-pulse">Khởi động TeamHub...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  return <LandingPage />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootIndex,
  },
  {
    path: "/landing",
    Component: LandingPage,
  },
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
        path: "workspaces",
        Component: WorkspaceListPage,
      },
      {
        path: "workspaces/:workspaceId",
        Component: WorkspaceDetailPage,
      },
      {
        path: "workspaces/:workspaceId/analytics",
        Component: WorkspaceAnalyticsPage,
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
        path: "boards/:boardId/analytics",
        Component: BoardAnalyticsPage,
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
