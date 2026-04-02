import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listsApi } from "../api/lists.api";
import type { MoveListRequest } from "../types/api";

export const useListMutations = (opts: { boardId: string }) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["board", opts.boardId, "detail"],
    });
  };

  const renameList = useMutation({
    mutationFn: (input: { listId: string; name: string }) =>
      listsApi.update(input.listId, { name: input.name }),
    onSuccess: invalidate,
  });

  const deleteList = useMutation({
    mutationFn: (listId: string) => listsApi.delete(listId),
    onSuccess: invalidate,
  });

  const moveList = useMutation({
    mutationFn: (input: { listId: string; data: MoveListRequest }) =>
      listsApi.move(input.listId, input.data),
    onSuccess: invalidate,
  });

  return { renameList, deleteList, moveList };
};
