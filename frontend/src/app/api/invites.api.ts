import { httpClient } from "./http";
import type {
  InviteToWorkspaceRequest,
} from "../types/api";

export type WorkspaceInviteInboxItem = {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  invitedBy?: {
    id: string;
    displayName: string;
    email?: string;
  };
  createdAt?: string;
};

export const invitesApi = {
  // Invite user to workspace
  inviteToWorkspace: async (
    workspaceId: string,
    data: InviteToWorkspaceRequest
  ): Promise<{ token: string }> => {
    const response = await httpClient.post<{ token: string }>(
      `/invites/workspaces/${workspaceId}`,
      data
    );
    return response.data;
  },

  // Accept workspace invite
  acceptWorkspaceInvite: async (token: string): Promise<void> => {
    await httpClient.post(`/invites/${token}/accept`);
  },

  // Inbox: list my pending workspace invites
  listMyWorkspaceInvites: async (): Promise<WorkspaceInviteInboxItem[]> => {
    const response = await httpClient.get<{ invites: WorkspaceInviteInboxItem[] }>(
      `/invites/inbox/workspaces`
    );
    return response.data.invites || [];
  },

  // Inbox: accept by inviteId
  acceptWorkspaceInviteInbox: async (inviteId: string): Promise<void> => {
    await httpClient.post(`/invites/inbox/workspaces/${inviteId}/accept`);
  },

  // Inbox: decline by inviteId
  declineWorkspaceInviteInbox: async (inviteId: string): Promise<void> => {
    await httpClient.post(`/invites/inbox/workspaces/${inviteId}/decline`);
  },
};
