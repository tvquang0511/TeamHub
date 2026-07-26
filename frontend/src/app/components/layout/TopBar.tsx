import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Check, Home, LogOut, Mail, Monitor, Moon, Sun, User, UserCircle, X, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitesApi } from "../../api/invites.api";
import { toast } from "sonner";
import { getToastErrorMessage } from "../../lib/apiError";

import { CommandMenu } from "../shared/CommandMenu";

import { NotificationBell } from "./NotificationBell";

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleGoProfile = () => {
    navigate("/profile");
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
      toast.success("Đã chấp nhận lời mời");
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể chấp nhận lời mời"));
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => invitesApi.declineWorkspaceInviteInbox(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", "inbox", "workspaces"] });
      toast.success("Đã từ chối lời mời");
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể từ chối lời mời"));
    },
  });

  const invitesCount = workspaceInvites?.length || 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md transition-colors duration-200">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <Link to="/workspaces" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              TeamHub
            </span>
          </Link>
        </div>

        {/* Center: Command Palette Search Bar (Desktop) */}
        <div className="flex-1 max-w-md mx-4 hidden md:flex justify-center">
          <CommandMenu />
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Icon */}
          <div className="md:hidden">
            <CommandMenu iconOnly />
          </div>

          {/* Realtime Notification Hub */}
          <NotificationBell />

          {/* Theme Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Toggle theme">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <span>Light</span>
                {theme === "light" && <Check className="ml-auto h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span>Dark</span>
                {theme === "dark" && <Check className="ml-auto h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>Hệ thống</span>
                {theme === "system" && <Check className="ml-auto h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Workspace Invites Inbox */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" aria-label="Workspace invites inbox" title="Lời mời Workspace">
                <Mail className="h-4 w-4 text-foreground/80" />
                {invitesCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
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
                  <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                    Bạn chưa có lời mời nào.
                  </div>
                ) : (
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {(workspaceInvites || []).map((inv) => (
                      <div
                        key={inv.invite.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {inv.workspace?.name || `Workspace ${inv.workspace?.id ?? inv.invite.workspaceId}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="text-xs">
                              Hết hạn: {new Date(inv.invite.expiresAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptInviteMutation.mutate(inv.invite.id)}
                            disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineInviteMutation.mutate(inv.invite.id)}
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

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || "User"} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-medium text-xs">
                    {user?.displayName ? getInitials(user.displayName) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleGoProfile}>
                <UserCircle className="mr-2 h-4 w-4" />
                Hồ sơ cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/landing")}>
                <Home className="mr-2 h-4 w-4 text-indigo-500" />
                Giới thiệu TeamHub
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
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
