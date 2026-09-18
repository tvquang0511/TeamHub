import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { usersApi } from "../../../api/users.api";
import { workspacesApi } from "../../../api/workspaces.api";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Search, UserPlus, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { User, WorkspaceMember } from "../../../types/api";
import { ConfirmWithRoleDialog, type Role3 } from "../../../components/shared/ConfirmWithRoleDialog";
import { getToastErrorMessage } from "../../../lib/apiError";

type Props = {
  workspaceId: string;
  existingMembers?: WorkspaceMember[];
  canManage: boolean;
};

export const AddWorkspaceMemberCard: React.FC<Props> = ({
  workspaceId,
  existingMembers,
  canManage,
}) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selected, setSelected] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const existingUserIds = useMemo(() => {
    return new Set((existingMembers || []).map((m) => m.userId));
  }, [existingMembers]);

  const addMemberMutation = useMutation({
    mutationFn: (input: { email: string; role: "ADMIN" | "MEMBER" }) =>
      workspacesApi.addMemberByEmail(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "members"] });
      toast.success("Đã thêm thành viên mới vào workspace thành công!");
      setConfirmOpen(false);
      setSelected(null);
      setSearchQuery("");
      setResults([]);
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể thêm thành viên"));
    },
  });

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await usersApi.search(searchQuery, { limit: 8 });
        setResults(users);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, workspaceId]);

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const openConfirm = (u: User) => {
    if (!canManage) {
      toast.error("Bạn không đủ quyền để thêm thành viên vào workspace");
      return;
    }
    setSelected(u);
    setConfirmOpen(true);
  };

  const handleConfirm = (role: Role3) => {
    if (!selected) return;

    if (role === "OWNER") {
      return;
    }

    addMemberMutation.mutate({ email: selected.email, role: role as "ADMIN" | "MEMBER" });
  };

  return (
    <>
      <Card className="overflow-hidden border border-border/70 bg-card shadow-xs rounded-xl">
        <div className="p-3 sm:p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tiêu đề và icon - Gọn gàng */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground leading-none">Thêm thành viên mới</h3>
                <p className="text-[11px] text-muted-foreground mt-1 hidden sm:block">
                  Tìm kiếm theo tên hoặc email để mời tham gia
                </p>
              </div>
            </div>

            {/* Ô tìm kiếm đặt ngay trên hàng tiêu đề */}
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nhập tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs bg-muted/30 border-border/70 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
                disabled={!canManage}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground h-4 w-4 rounded-full flex items-center justify-center hover:bg-muted"
                  title="Xoá tìm kiếm"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {!canManage ? (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              Chỉ Owner hoặc Admin của Workspace mới có quyền thêm thành viên mới.
            </div>
          ) : null}

          {/* Kết quả tìm kiếm bung ra phía dưới khi có từ khoá */}
          {searchQuery ? (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-inner">
                {isSearching ? (
                  <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Đang tìm kiếm người dùng...
                  </div>
                ) : results.length > 0 ? (
                  <div className="max-h-56 divide-y divide-border/40 overflow-y-auto">
                    {results.map((u) => {
                      const already = existingUserIds.has(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => openConfirm(u)}
                          disabled={already || addMemberMutation.isPending}
                          className={
                            "flex w-full items-center gap-2.5 p-2.5 text-left transition-colors hover:bg-blue-500/5 disabled:cursor-not-allowed disabled:opacity-60 " +
                            (!canManage ? "opacity-60" : "")
                          }
                        >
                          <Avatar className="h-8 w-8">
                            {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.displayName} /> : null}
                            <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
                              {getInitials(u.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-foreground">{u.displayName}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {already ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Đã tham gia
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors">
                                <UserPlus className="h-3 w-3" /> Mời
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Không tìm thấy người dùng nào phù hợp với từ khóa <span className="font-semibold text-foreground">"{searchQuery}"</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <ConfirmWithRoleDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={selected ? `Thêm ${selected.displayName} vào workspace?` : "Thêm thành viên"}
        description={selected ? selected.email : undefined}
        confirmText="Thêm ngay"
        roleLabel="Chọn vai trò"
        allowOwner={false}
        defaultRole="MEMBER"
        loading={addMemberMutation.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
};
