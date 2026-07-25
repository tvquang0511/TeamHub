import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, CheckCircle2, UserCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { notificationsApi, type NotificationItem } from "../../api/notifications.api";
import { getGlobalSocket } from "../../lib/socket";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.listMy(1, 20),
    refetchInterval: 30000, // Refresh every 30s as fallback
  });

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  // Realtime Socket listener
  useEffect(() => {
    const socket = getGlobalSocket();
    if (!socket) return;

    const handleNewNotification = (notification: NotificationItem) => {
      // Refresh notifications query
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Toast push alert
      toast.info(notification.title, {
        description: notification.content,
        action: notification.linkUrl
          ? {
              label: "Xem",
              onClick: () => navigate(notification.linkUrl!),
            }
          : undefined,
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [queryClient, navigate]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    setOpen(false);
    if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CARD_ASSIGNED":
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case "COMMENT_MENTION":
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 border bg-popover/95 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Thông báo</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5 text-blue-500" />
              Đọc tất cả
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[380px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30 mb-2" />
              <span>Chưa có thông báo nào</span>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3 p-3 text-xs transition-colors hover:bg-muted/60 cursor-pointer ${
                    !item.isRead ? "bg-blue-500/5 font-medium" : "opacity-80"
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                    <AvatarImage src={item.actor?.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {item.actor?.displayName ? item.actor.displayName.charAt(0) : "T"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getNotificationIcon(item.type)}
                        <span className="truncate font-semibold text-foreground">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  {!item.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                    title="Xoá thông báo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
