import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { notify } from "../../../lib/toastHelper";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { boardsApi } from "../../../api/boards.api";
import { cardsApi } from "../../../api/cards.api";

interface ConvertMessageToCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  messageId?: string;
  defaultTitle: string;
  defaultDescription?: string;
}

export const ConvertMessageToCardDialog: React.FC<ConvertMessageToCardDialogProps> = ({
  open,
  onOpenChange,
  boardId,
  messageId,
  defaultTitle,
  defaultDescription,
}) => {
  const queryClient = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [prevMessageId, setPrevMessageId] = useState(messageId);

  // Adjust state during render when messageId changes
  if (messageId !== prevMessageId) {
    setPrevMessageId(messageId);
    setTitle(defaultTitle);
    setDescription(defaultDescription ?? "");
  }

  const { data: boardDetail } = useQuery({
    queryKey: ["board", boardId, "detail"],
    queryFn: () => boardsApi.getDetail(boardId),
    enabled: open && !!boardId,
  });

  const lists = boardDetail?.lists ?? [];
  const activeListId = selectedListId || (lists.length > 0 ? lists[0].id : "");

  const createCardMutation = useMutation({
    mutationFn: async () => {
      if (!activeListId) throw new Error("Vui lòng chọn Cột (List)");
      if (!title.trim()) throw new Error("Tiêu đề Card không được để trống");

      return cardsApi.createCardFromMessage({
        listId: activeListId,
        messageId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
    },
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["activities", "board", boardId] });
      notify.success(`Đã tạo Card "${card.title}" từ tin nhắn chat!`);
      onOpenChange(false);
    },
    onError: (err: any) => {
      notify.error(err, "Không thể chuyển tin nhắn thành Card");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Tạo Card mới từ Tin nhắn Chat
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCardMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Chọn Cột (List) đặt Card *</Label>
            <div className="relative">
              <select
                value={activeListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                required
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tiêu đề Card *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề card..."
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mô tả chi tiết (Điền từ tin nhắn)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nội dung mô tả..."
              className="text-xs min-h-24"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={createCardMutation.isPending}>
              {createCardMutation.isPending ? "Đang tạo..." : "Xác nhận tạo Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
