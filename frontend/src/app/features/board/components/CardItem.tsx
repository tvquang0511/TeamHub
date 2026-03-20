import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Calendar, Trash2 } from "lucide-react";
// toast placeholder (wire real toast later)
import type { Card } from "../../../types/api";

interface CardItemProps {
  card: Card;
  listId: string;
}

export const CardItem: React.FC<CardItemProps> = ({ card, listId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const queryClient = useQueryClient();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "CARD",
    item: { id: card.id, listId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const updateCardMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string }) =>
      cardsApi.update(card.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      // toast: updated
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: () => cardsApi.delete(card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setIsModalOpen(false);
      // toast: deleted
    },
  });

  const handleSave = () => {
    if (title.trim()) {
      updateCardMutation.mutate({
        title: title !== card.title ? title : undefined,
        description: description !== card.description ? description : undefined,
      });
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div
        ref={(node) => {
          drag(node);
        }}
        onClick={() => setIsModalOpen(true)}
        className={`cursor-pointer rounded-md bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        <p className="text-sm">{card.title}</p>
        {card.dueDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            {new Date(card.dueDate).toLocaleDateString("vi-VN")}
          </div>
        )}
        {card.labels && card.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="rounded px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardTitle">Tiêu đề</Label>
              <Input
                id="cardTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề card..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardDescription">Mô tả</Label>
              <Textarea
                id="cardDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm mô tả chi tiết..."
                rows={6}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="destructive"
                onClick={() => deleteCardMutation.mutate()}
                disabled={deleteCardMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá card
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Huỷ
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateCardMutation.isPending}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
