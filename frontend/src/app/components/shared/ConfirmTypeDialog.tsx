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
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  /** The exact text user must type (e.g. "delete") */
  expectedText: string;
  inputLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const ConfirmTypeDialog: React.FC<Props> = ({
  open,
  title,
  description,
  confirmText = "Xoá",
  cancelText = "Huỷ",
  destructive,
  loading,
  expectedText,
  inputLabel,
  onOpenChange,
  onConfirm,
}) => {
  const [value, setValue] = useState("");

  const canConfirm = useMemo(
    () => value.trim().toLowerCase() === expectedText.trim().toLowerCase(),
    [value, expectedText]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setValue("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          <Label>{inputLabel || `Gõ \"${expectedText}\" để xác nhận`}</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={expectedText} />
          <div className="text-xs text-gray-500">
            Bạn cần nhập chính xác: <span className="font-mono font-semibold">{expectedText}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading || !canConfirm}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
