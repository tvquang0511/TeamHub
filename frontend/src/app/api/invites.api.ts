import { httpClient } from "./http";
import type {
  InviteToWorkspaceRequest,
} from "../types/api";

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type WorkspaceInviteInboxItem = {
  invite: WorkspaceInvite;
  workspace: {
    id: string;
    name: string;
  };
};

export type AcceptInviteResponse = {
  workspace: {
    id: string;
    name: string;
  };
};

export const invitesApi = {
  // Invite user to workspace
  inviteToWorkspace: async (
    workspaceId: string,
    data: InviteToWorkspaceRequest
  ): Promise<{ invite: { id: string; email: string; token: string; expiresAt: string } }> => {
    const response = await httpClient.post<{ invite: { id: string; email: string; token: string; expiresAt: string } }>(
      `/invites/workspaces/${workspaceId}`,
      data
    );
    return response.data;
  },

  // Accept workspace invite
  acceptWorkspaceInvite: async (token: string): Promise<AcceptInviteResponse> => {
    const res = await httpClient.post<AcceptInviteResponse>(`/invites/${token}/accept`);
    return res.data;
  },

  // Inbox: list my pending workspace invites
  listMyWorkspaceInvites: async (): Promise<WorkspaceInviteInboxItem[]> => {
    const response = await httpClient.get<{ invites: WorkspaceInviteInboxItem[] }>(
      `/invites/inbox/workspaces`
    );
    return response.data.invites || [];
  },

  // Inbox: accept by inviteId
  acceptWorkspaceInviteInbox: async (inviteId: string): Promise<AcceptInviteResponse> => {
    const res = await httpClient.post<AcceptInviteResponse>(
      `/invites/inbox/workspaces/${inviteId}/accept`
    );
    return res.data;
  },

  // Inbox: decline by inviteId
  declineWorkspaceInviteInbox: async (inviteId: string): Promise<{ ok: boolean }> => {
    const res = await httpClient.post<{ ok: boolean }>(
      `/invites/inbox/workspaces/${inviteId}/decline`
    );
    return res.data;
  },
};
