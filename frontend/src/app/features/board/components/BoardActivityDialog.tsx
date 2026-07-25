import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Clock, Activity } from "lucide-react";
import { activitiesApi, type ActivityItem } from "../../../api/activities.api";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface BoardActivityDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BoardActivityDialog: React.FC<BoardActivityDialogProps> = ({
  boardId,
  open,
  onOpenChange,
}) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities", "board", boardId],
    queryFn: () => activitiesApi.getBoardActivities(boardId),
    enabled: open && !!boardId,
  });

  const formatActivityText = (act: ActivityItem) => {
    const cardTitle = act.card?.title ? `"${act.card.title}"` : "";

    switch (act.type) {
      case "CARD_CREATED":
        return `Đã tạo thẻ mới ${cardTitle}`;
      case "CARD_UPDATED":
        return `Đã cập nhật thông tin thẻ ${cardTitle}`;
      case "CARD_MOVED":
        return `Đã di chuyển thẻ ${cardTitle}`;
      case "CARD_DELETED":
        return `Đã xóa một thẻ`;
      case "LIST_CREATED":
        return `Đã tạo một danh sách mới`;
      case "LIST_MOVED":
        return `Đã thay đổi vị trí danh sách`;
      case "COMMENT_ADDED":
        return `Đã thêm bình luận vào thẻ ${cardTitle}`;
      case "ASSIGNEE_ADDED":
        return `Đã giao thẻ ${cardTitle} cho thành viên`;
      case "ASSIGNEE_REMOVED":
        return `Đã bỏ phân công thành viên khỏi thẻ ${cardTitle}`;
      case "LABEL_ADDED":
        return `Đã gắn nhãn vào thẻ ${cardTitle}`;
      case "LABEL_REMOVED":
        return `Đã gỡ nhãn khỏi thẻ ${cardTitle}`;
      case "CHECKLIST_CREATED":
        return `Đã tạo danh sách việc cần làm (Checklist)`;
      default:
        return `Đã thực hiện thao tác ${act.type}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <History className="h-5 w-5 text-primary" />
            <span>Nhật ký hoạt động (Audit Log)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Activity className="h-6 w-6 animate-spin text-primary" />
              <span>Đang tải nhật ký...</span>
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Chưa có nhật ký hoạt động nào trên bảng này.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {activities.map((act) => (
                <div key={act.id} className="relative flex items-start gap-3 text-xs group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                  {/* Actor Avatar */}
                  <Avatar className="h-7 w-7 shrink-0">
                    {act.actor.avatarUrl ? (
                      <AvatarImage src={act.actor.avatarUrl} alt={act.actor.displayName} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {getInitials(act.actor.displayName || "U")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {act.actor.displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(act.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      {formatActivityText(act)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
