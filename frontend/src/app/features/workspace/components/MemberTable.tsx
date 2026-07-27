import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../../../api/workspaces.api";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { MoreHorizontal, Shield, ShieldCheck, LogOut, UserMinus, Crown, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember } from "../../../types/api";
import { getToastErrorMessage } from "../../../lib/apiError";

interface MemberTableProps {
  members: WorkspaceMember[];
  workspaceId: string;
  canManage: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  workspaceId,
  canManage,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const updateRoleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      workspacesApi.updateMemberRole(workspaceId, input.userId, input.role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "members"],
      });
      toast.success("Đã cập nhật vai trò thành viên thành công");
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể cập nhật vai trò"));
    },
  });

  const leaveWorkspaceMutation = useMutation({
    mutationFn: () => workspacesApi.leave(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Bạn đã rời workspace");
      navigate("/workspaces");
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể rời workspace"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      workspacesApi.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "members"],
      });
      toast.success("Đã xoá thành viên khỏi workspace");
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể xoá thành viên"));
    },
  });

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return (
          <Badge className="border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-sm px-2.5 py-0.5 gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
            Chủ sở hữu
          </Badge>
        );
      case "ADMIN":
        return (
          <Badge className="border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm px-2.5 py-0.5 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Quản trị viên
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium px-2.5 py-0.5 gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            Thành viên
          </Badge>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-md backdrop-blur-sm transition-all">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            {members.length}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Danh sách thành viên Workspace</h3>
            <p className="text-xs text-muted-foreground">Quản lý quyền hạn và danh sách thành viên đang hoạt động</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 font-medium self-start sm:self-auto"
          onClick={() => leaveWorkspaceMutation.mutate()}
          disabled={leaveWorkspaceMutation.isPending}
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          {leaveWorkspaceMutation.isPending ? "Đang rời..." : "Rời workspace"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-[300px] font-semibold">Thành viên</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Vai trò</TableHead>
            <TableHead className="font-semibold">Ngày tham gia</TableHead>
            <TableHead className="w-12 text-right font-semibold"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const displayName = member.displayName || member.email || "(Không tên)";
            return (
              <TableRow key={member.id} className="transition-colors hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/80 shadow-xs">
                      {member.avatarUrl ? (
                        <AvatarImage
                          src={member.avatarUrl}
                          alt={displayName}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-sm text-foreground">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground sm:hidden">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.email || "—"}</TableCell>
                <TableCell>{renderRoleBadge(member.role)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("vi-VN") : "Gần đây"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== "OWNER" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            if (!canManage) {
                              e.preventDefault();
                              toast.error("Bạn không đủ quyền để đổi vai trò thành viên");
                              return;
                            }
                            updateRoleMutation.mutate({
                              userId: member.userId,
                              role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                            });
                          }}
                          disabled={updateRoleMutation.isPending}
                          className={!canManage ? "opacity-50" : undefined}
                        >
                          {member.role === "ADMIN" ? (
                            <>
                              <Shield className="mr-2 h-4 w-4 text-slate-500" />
                              Hạ xuống Member
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="mr-2 h-4 w-4 text-indigo-600" />
                              Nâng lên Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            if (!canManage) {
                              e.preventDefault();
                              toast.error("Bạn không đủ quyền để xoá thành viên");
                              return;
                            }
                            removeMemberMutation.mutate(member.userId);
                          }}
                          className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/40"
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Xoá khỏi workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
