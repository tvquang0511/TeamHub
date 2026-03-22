import { httpClient } from "./http";
import { invitesApi } from "./invites.api";
import type {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceRequest,
  Board,
} from "../types/api";

type ListMyWorkspacesResponse = {
  workspaces: Array<{
    id: string;
    name: string;
    description?: string | null;
    createdAt?: string;
    updatedAt?: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | string;
  }>;
};

type WorkspaceResponse = {
  workspace: {
    id: string;
    name: string;
    description?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
};

type MembersResponse = {
  members: Array<{ id: string; userId: string; displayName: string; role: "OWNER" | "ADMIN" | "MEMBER" }>;
};

export const workspacesApi = {
  // Get all workspaces for current user
  getAll: async (): Promise<Workspace[]> => {
    const response = await httpClient.get<ListMyWorkspacesResponse>("/workspaces");

    return (response.data.workspaces || []).map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description ?? undefined,
      createdAt: w.createdAt || new Date().toISOString(),
      updatedAt: w.updatedAt || new Date().toISOString(),
      ownerId: "",
    }));
  },

  // Get workspace by ID
  getById: async (id: string): Promise<Workspace> => {
    const response = await httpClient.get<WorkspaceResponse>(`/workspaces/${id}`);
    const ws = response.data.workspace;
    return {
      id: ws.id,
      name: ws.name,
      description: ws.description ?? undefined,
      createdAt: ws.createdAt || new Date().toISOString(),
      updatedAt: ws.updatedAt || new Date().toISOString(),
      ownerId: "",
    };
  },

  // Create workspace
  create: async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    const response = await httpClient.post<WorkspaceResponse>("/workspaces", {
      name: data.name,
      description: data.description,
    });
    const ws = response.data.workspace;
    return {
      id: ws.id,
      name: ws.name,
      description: ws.description ?? data.description,
      createdAt: ws.createdAt || new Date().toISOString(),
      updatedAt: ws.updatedAt || new Date().toISOString(),
      ownerId: "",
    };
  },

  // Update workspace
  update: async (
    id: string,
    data: Partial<CreateWorkspaceRequest>
  ): Promise<Workspace> => {
    // Backend doesn't currently expose workspace update; keep method for future.
    // We still call it in case backend exists, but normalize any response.
    const response = await httpClient.patch<any>(`/workspaces/${id}`, data);
    const ws = response.data?.workspace || response.data;
    return {
      id: ws?.id || id,
      name: ws?.name || data.name || "",
      description: ws?.description || data.description,
      createdAt: ws?.createdAt || new Date().toISOString(),
      updatedAt: ws?.updatedAt || new Date().toISOString(),
      ownerId: ws?.ownerId || "",
    };
  },

  // Delete workspace
  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/workspaces/${id}`);
  },

  // Get workspace members
  getMembers: async (id: string): Promise<WorkspaceMember[]> => {
    const response = await httpClient.get<MembersResponse>(`/workspaces/${id}/members`);
    return (response.data.members || []).map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: id,
      role: m.role,
      user: {
        id: m.userId,
        email: "",
        displayName: m.displayName,
      },
      joinedAt: new Date().toISOString(),
    }));
  },

  // Add member by email
  addMemberByEmail: async (
    workspaceId: string,
    data: { email: string; role: "ADMIN" | "MEMBER" }
  ): Promise<WorkspaceMember> => {
    // Backend doesn't implement direct add-by-email for workspaces.
    // The supported flow is: create a workspace invite, then invitee accepts.
    // We still accept `role` in the UI, but backend currently always adds as MEMBER.
    // (See notes in invitesService.accept* methods.)
    await invitesApi.inviteToWorkspace(workspaceId, { email: data.email });

    // We can't return a WorkspaceMember because the member won't exist until acceptance.
    // Return a placeholder shape for callers that expect a value.
    return {
      id: "",
      userId: "",
      workspaceId,
      role: data.role,
      user: { id: "", email: data.email, displayName: data.email },
      joinedAt: new Date().toISOString(),
    } as any;
  },

  // Update member role
  updateMemberRole: async (
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<WorkspaceMember> => {
    const response = await httpClient.patch<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${userId}`,
      { role }
    );
    return response.data;
  },

  // Remove member
  removeMember: async (workspaceId: string, userId: string): Promise<void> => {
    await httpClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  // Leave workspace
  leave: async (workspaceId: string): Promise<void> => {
    await httpClient.post(`/workspaces/${workspaceId}/leave`);
  },

  // Get workspace boards
  getBoards: async (workspaceId: string): Promise<Board[]> => {
    // Backend boards listing is filtered by workspaceId via query param.
    const response = await httpClient.get<{ boards: Board[] }>('/boards', {
      params: { workspaceId },
    });
    return response.data.boards;
  },
};
