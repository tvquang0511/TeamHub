import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../api/cards.api";
import type { MoveCardRequest, UpdateCardRequest } from "../types/api";

export const useCardMutations = (opts: { boardId: string }) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["board", opts.boardId, "detail"],
    });
  };

  const updateCard = useMutation({
    mutationFn: (input: { cardId: string; data: UpdateCardRequest }) =>
      cardsApi.update(input.cardId, input.data),
    onSuccess: invalidate,
  });

  const deleteCard = useMutation({
    mutationFn: (cardId: string) => cardsApi.delete(cardId),
    onSuccess: invalidate,
  });

  const moveCard = useMutation({
    mutationFn: (input: { cardId: string; data: MoveCardRequest }) =>
      cardsApi.move(input.cardId, input.data),
    onSuccess: invalidate,
  });

  return { updateCard, deleteCard, moveCard };
};
