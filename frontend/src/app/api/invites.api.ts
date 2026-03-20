import { httpClient } from "./http";
import type {
  InviteToWorkspaceRequest,
  InviteToBoardRequest,
} from "../types/api";

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

  // Invite user to board
  inviteToBoard: async (
    boardId: string,
    data: InviteToBoardRequest
  ): Promise<{ token: string }> => {
    const response = await httpClient.post<{ token: string }>(
      `/invites/boards/${boardId}`,
      data
    );
    return response.data;
  },

  // Accept board invite
  acceptBoardInvite: async (token: string): Promise<void> => {
    await httpClient.post(`/invites/boards/token/${token}/accept`);
  },
};
