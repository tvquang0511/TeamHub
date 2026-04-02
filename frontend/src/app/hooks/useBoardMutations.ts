import { useMutation, useQueryClient } from "@tanstack/react-query";
import { boardsApi } from "../api/boards.api";
import type { CreateBoardRequest } from "../types/api";

export const useBoardMutations = (opts: {
  boardId?: string;
  workspaceId?: string;
}) => {
  const queryClient = useQueryClient();
  const { boardId, workspaceId } = opts;

  const invalidateBoard = () => {
    if (boardId) {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    }
  };

  const invalidateWorkspaceBoards = () => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "boards"],
      });
    }
  };

  const updateBoard = useMutation({
    mutationFn: (input: { id: string; data: Partial<CreateBoardRequest> }) =>
      boardsApi.update(input.id, input.data),
    onSuccess: () => {
      invalidateBoard();
      invalidateWorkspaceBoards();
    },
  });

  const deleteBoard = useMutation({
    mutationFn: (id: string) => boardsApi.delete(id),
    onSuccess: () => {
      invalidateWorkspaceBoards();
    },
  });

  return { updateBoard, deleteBoard };
};
