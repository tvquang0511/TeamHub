import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDrop } from "react-dnd";
import { listsApi } from "../../../api/lists.api";
import { cardsApi } from "../../../api/cards.api";
import { CardItem } from "./CardItem";
import { AddCardButton } from "./AddCardButton";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import type { List } from "../../../types/api";

interface ListColumnProps {
  list: List;
  boardId: string;
}

export const ListColumn: React.FC<ListColumnProps> = ({ list, boardId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [listName, setListName] = useState(list.name);
  const queryClient = useQueryClient();

  const updateListMutation = useMutation({
    mutationFn: (name: string) => listsApi.update(list.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      setIsEditing(false);
      toast.success("Đã cập nhật list!");
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: () => listsApi.delete(list.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      toast.success("Đã xoá list!");
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: any }) =>
      cardsApi.move(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "CARD",
    drop: (item: { id: string; listId: string }, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;

      if (item.listId !== list.id) {
        // Move to this list
        moveCardMutation.mutate({
          cardId: item.id,
          data: { toListId: list.id },
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }));

  const handleSaveName = () => {
    if (listName.trim() && listName !== list.name) {
      updateListMutation.mutate(listName);
    } else {
      setIsEditing(false);
      setListName(list.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setListName(list.name);
    }
  };

  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className={`flex h-fit min-w-[280px] max-w-[280px] flex-col rounded-lg bg-gray-100 transition-colors ${
        isOver ? "bg-gray-200" : ""
      }`}
    >
      {/* List Header */}
      <div className="flex items-center justify-between gap-2 p-3">
        {isEditing ? (
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 flex-1"
          />
        ) : (
          <h3
            className="flex-1 cursor-pointer font-semibold"
            onClick={() => setIsEditing(true)}
          >
            {list.name}
          </h3>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Đổi tên
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteListMutation.mutate()}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xoá list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-3 pb-2">
        {sortedCards.map((card) => (
          <CardItem key={card.id} card={card} listId={list.id} />
        ))}
      </div>

      {/* Add Card Button */}
      <div className="p-3 pt-0">
        <AddCardButton listId={list.id} boardId={boardId} />
      </div>
    </div>
  );
};
