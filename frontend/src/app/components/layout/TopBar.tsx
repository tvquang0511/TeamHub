import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Bell, Check, LogOut, User, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitesApi } from "../../api/invites.api";

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const { data: workspaceInvites } = useQuery({
    queryKey: ["invites", "inbox", "workspaces"],
    queryFn: () => invitesApi.listMyWorkspaceInvites(),
    enabled: !!user?.email,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => invitesApi.acceptWorkspaceInviteInbox(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", "inbox", "workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error?.message || "Không thể chấp nhận lời mời");
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => invitesApi.declineWorkspaceInviteInbox(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", "inbox", "workspaces"] });
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error?.message || "Không thể từ chối lời mời");
    },
  });

  const invitesCount = workspaceInvites?.length || 0;

  return (
    <header className="border-b bg-white">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/workspaces" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 font-bold text-white">
              T
            </div>
            <span className="text-xl font-bold text-gray-900">TeamHub</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9" aria-label="Workspace invites">
                <Bell className="h-5 w-5" />
                {invitesCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
                    {invitesCount > 99 ? "99+" : invitesCount}
                  </span>
                ) : null}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Lời mời vào workspace</DialogTitle>
                <DialogDescription>
                  Danh sách lời mời đang chờ bạn phản hồi.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {invitesCount === 0 ? (
                  <div className="rounded-md border p-4 text-center text-sm text-gray-600">
                    Bạn chưa có lời mời nào.
                  </div>
                ) : (
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {(workspaceInvites || []).map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">
                            {inv.workspaceName || `Workspace ${inv.workspaceId}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            Vai trò: <span className="font-medium">{inv.role}</span>
                            {inv.invitedBy?.displayName ? (
                              <>
                                {" "}· Mời bởi <span className="font-medium">{inv.invitedBy.displayName}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptInviteMutation.mutate(inv.id)}
                            disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineInviteMutation.mutate(inv.id)}
                            disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Từ chối
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.displayName ? getInitials(user.displayName) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
