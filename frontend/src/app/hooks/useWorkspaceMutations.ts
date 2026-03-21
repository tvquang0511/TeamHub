import { useMutation, useQueryClient } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces.api";

export const useWorkspaceMutations = (opts?: { workspaceId?: string }) => {
  const queryClient = useQueryClient();

  const invalidateWorkspaces = () => {
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };

  const invalidateWorkspace = () => {
    if (!opts?.workspaceId) return;
    queryClient.invalidateQueries({ queryKey: ["workspace", opts.workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["workspace", opts.workspaceId, "boards"] });
    queryClient.invalidateQueries({ queryKey: ["workspace", opts.workspaceId, "members"] });
  };

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) => workspacesApi.delete(id),
    onSuccess: () => {
      invalidateWorkspace();
      invalidateWorkspaces();
    },
  });

  return { deleteWorkspace };
};
