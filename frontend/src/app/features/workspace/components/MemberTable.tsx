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
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { MoreHorizontal, Shield, ShieldCheck, LogOut, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember } from "../../../types/api";

interface MemberTableProps {
  members: WorkspaceMember[];
  workspaceId: string;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  workspaceId,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // TODO: wire actual permission from workspace detail/current user.
  const canManage = true;

  const updateRoleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      workspacesApi.updateMemberRole(workspaceId, input.userId, input.role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "members"],
      });
      toast.success("Đã cập nhật vai trò thành viên");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "Không thể cập nhật vai trò");
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
      toast.error(error.response?.data?.error?.message || "Không thể rời workspace");
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
      toast.error(error.response?.data?.error?.message || "Không thể xoá thành viên");
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="text-sm text-gray-600">
          Tổng: <span className="font-medium text-gray-900">{members.length}</span> thành viên
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => leaveWorkspaceMutation.mutate()}
          disabled={leaveWorkspaceMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {leaveWorkspaceMutation.isPending ? "Đang rời..." : "Rời workspace"}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thành viên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Ngày tham gia</TableHead>
            <TableHead className="w-12.5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(member.displayName || member.email || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.displayName || member.email || "(unknown)"}</span>
                </div>
              </TableCell>
              <TableCell>{member.email || ""}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {member.role === "OWNER"
                    ? "Chủ sở hữu"
                    : member.role === "ADMIN"
                    ? "Quản trị viên"
                    : "Thành viên"}
                </Badge>
              </TableCell>
              <TableCell>
                {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("vi-VN") : ""}
              </TableCell>
              <TableCell>
                {member.role !== "OWNER" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          updateRoleMutation.mutate({
                            userId: member.userId,
                            role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                          })
                        }
                        disabled={!canManage || updateRoleMutation.isPending}
                        className={!canManage ? "opacity-50 pointer-events-none" : undefined}
                      >
                        {member.role === "ADMIN" ? (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Hạ xuống Member
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Nâng lên Admin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        className="text-red-600"
                        disabled={!canManage || removeMemberMutation.isPending}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Xoá khỏi workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
