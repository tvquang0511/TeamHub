import React, { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type Role3 = "OWNER" | "ADMIN" | "MEMBER";

type RoleOption = {
  value: Role3;
  label: string;
  description?: string;
  disabled?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: string;

  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;

  roleLabel?: string;
  roleOptions?: RoleOption[];
  defaultRole?: Role3;
  allowOwner?: boolean;

  onConfirm: (role: Role3) => void;
};

export const ConfirmWithRoleDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Huỷ",
  destructive,
  loading,
  roleLabel = "Vai trò",
  roleOptions,
  defaultRole = "MEMBER",
  allowOwner = true,
  onConfirm,
}) => {
  const options = useMemo<RoleOption[]>(() => {
    if (roleOptions?.length) return roleOptions;

    return [
      {
        value: "OWNER",
        label: "OWNER",
        description: "Toàn quyền trong workspace/board.",
        disabled: !allowOwner,
      },
      {
        value: "ADMIN",
        label: "ADMIN",
        description: "Quản trị, có quyền quản lý thành viên.",
      },
      {
        value: "MEMBER",
        label: "MEMBER",
        description: "Thành viên thường.",
      },
    ];
  }, [roleOptions, allowOwner]);

  const firstEnabled = options.find((o) => !o.disabled)?.value;
  const initialRole = options.some((o) => o.value === defaultRole && !o.disabled)
    ? defaultRole
    : firstEnabled || "MEMBER";

  const [role, setRole] = useState<Role3>(initialRole);

  // Keep role stable when reopening, but also adapt if defaultRole/allowOwner changes.
  React.useEffect(() => {
    if (!open) return;
    setRole((prev) => {
      const stillEnabled = options.some((o) => o.value === prev && !o.disabled);
      if (stillEnabled) return prev;
      return initialRole;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, allowOwner]);

  const selected = options.find((o) => o.value === role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">{roleLabel}</div>
          <Select value={role} onValueChange={(v) => setRole(v as Role3)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected?.description ? (
            <div className="text-xs text-gray-600">{selected.description}</div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(role)}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
