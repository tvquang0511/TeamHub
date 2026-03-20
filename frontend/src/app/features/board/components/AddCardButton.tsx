import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Plus, X } from "lucide-react";
// toast placeholder (wire real toast later)

interface AddCardButtonProps {
  listId: string;
  boardId: string;
}

export const AddCardButton: React.FC<AddCardButtonProps> = ({
  listId,
  boardId,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const queryClient = useQueryClient();

  const createCardMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      setCardTitle("");
      setIsAdding(false);
      // toast: created
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error?.message || "Không thể tạo card");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardTitle.trim()) {
      createCardMutation.mutate({
        title: cardTitle,
        listId,
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setCardTitle("");
  };

  if (isAdding) {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          value={cardTitle}
          onChange={(e) => setCardTitle(e.target.value)}
          placeholder="Nhập tiêu đề card..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={createCardMutation.isPending}
          >
            Thêm card
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-gray-600"
      onClick={() => setIsAdding(true)}
    >
      <Plus className="mr-2 h-4 w-4" />
      Thêm card
    </Button>
  );
};
