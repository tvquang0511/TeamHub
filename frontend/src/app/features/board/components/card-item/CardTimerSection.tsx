import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { cardsApi } from "../../../../api/cards.api";
import type { Card } from "../../../../types/api";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { Progress } from "../../../../components/ui/progress";

interface CardTimerSectionProps {
  card: Card;
  boardId: string;
  canWrite: boolean;
}

export const CardTimerSection: React.FC<CardTimerSectionProps> = ({ card, boardId, canWrite }) => {
  const queryClient = useQueryClient();
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("");
  const [estimateInput, setEstimateInput] = useState(card.estimatedHours ? String(card.estimatedHours) : "");

  const isTimerRunning = !!card.timerStartedAt;

  // Live timer interval update
  useEffect(() => {
    if (!isTimerRunning || !card.timerStartedAt) {
      setLiveElapsed(0);
      return;
    }

    const startTime = new Date(card.timerStartedAt).getTime();
    const updateElapsed = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setLiveElapsed(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, card.timerStartedAt]);

  const updateCardCache = (updatedCard: Card) => {
    queryClient.setQueryData(["board", boardId, "detail"], (oldData: any) => {
      if (!oldData || !oldData.lists) return oldData;
      return {
        ...oldData,
        lists: oldData.lists.map((list: any) => ({
          ...list,
          cards: list.cards.map((c: any) =>
            c.id === card.id ? { ...c, ...updatedCard } : c
          ),
        })),
      };
    });
  };

  const startTimerMutation = useMutation({
    mutationFn: () => cardsApi.startTimer(card.id),
    onMutate: () => {
      // Instant Optimistic update
      const now = new Date().toISOString();
      updateCardCache({ ...card, timerStartedAt: now });
    },
    onSuccess: (updatedCard) => {
      updateCardCache(updatedCard);
      toast.success("Đã bắt đầu bấm giờ!");
    },
    onError: () => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => cardsApi.stopTimer(card.id),
    onMutate: () => {
      // Instant Optimistic update
      const addedSec = liveElapsed;
      const newLogged = (card.loggedSeconds || 0) + addedSec;
      updateCardCache({ ...card, loggedSeconds: newLogged, timerStartedAt: null, timerStartedBy: null });
    },
    onSuccess: (updatedCard) => {
      updateCardCache(updatedCard);
      toast.success("Đã dừng bấm giờ và lưu thời gian!");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const logManualMutation = useMutation({
    mutationFn: (seconds: number) => cardsApi.logTimeManual(card.id, seconds),
    onSuccess: (updatedCard) => {
      updateCardCache(updatedCard);
      setManualMinutes("");
      toast.success("Đã ghi nhận thời gian thủ công!");
    },
  });

  const setEstimateMutation = useMutation({
    mutationFn: (hours: number | null) => cardsApi.setEstimate(card.id, hours),
    onSuccess: (updatedCard) => {
      updateCardCache(updatedCard);
      toast.success("Đã cập nhật thời gian ước tính (Estimate)!");
    },
  });

  const formatSecondsToHms = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(secs)}s`;
    }
    return `${pad(minutes)}m ${pad(secs)}s`;
  };

  const formatHoursDisplay = (totalSeconds: number) => {
    const hours = (totalSeconds / 3600).toFixed(1);
    return `${hours} giờ`;
  };

  const totalLoggedSec = (card.loggedSeconds || 0) + (isTimerRunning ? liveElapsed : 0);
  const loggedHoursNum = totalLoggedSec / 3600;
  const estimatedHoursNum = card.estimatedHours || 0;
  const progressPct = estimatedHoursNum > 0 ? Math.min(100, (loggedHoursNum / estimatedHoursNum) * 100) : 0;
  const isOverBudget = estimatedHoursNum > 0 && loggedHoursNum > estimatedHoursNum;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quản lý Thời gian (Time Tracking)
          </h4>
        </div>

        {/* Start / Stop Timer Button */}
        {canWrite && (
          <div className="flex items-center gap-2">
            {isTimerRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => stopTimerMutation.mutate()}
                disabled={stopTimerMutation.isPending}
                className="h-8 gap-1.5 font-semibold animate-pulse"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Dừng ({formatSecondsToHms(liveElapsed)})</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => startTimerMutation.mutate()}
                disabled={startTimerMutation.isPending}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Bắt đầu Bấm giờ</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Logged & Estimate Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border bg-background p-2.5">
          <div className="text-muted-foreground mb-1">Thời gian đã làm:</div>
          <div className="text-base font-bold text-foreground">
            {formatHoursDisplay(totalLoggedSec)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              ({formatSecondsToHms(totalLoggedSec)})
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">Ước tính (Estimate):</span>
            {canWrite && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[10px] text-primary hover:underline">Sửa</button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Số giờ ước tính:</label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="VD: 4.5"
                      value={estimateInput}
                      onChange={(e) => setEstimateInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        const val = parseFloat(estimateInput);
                        setEstimateMutation.mutate(isNaN(val) ? null : val);
                      }}
                    >
                      Lưu Estimate
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="text-base font-bold text-foreground">
            {estimatedHoursNum > 0 ? `${estimatedHoursNum} giờ` : "Chưa đặt"}
          </div>
        </div>
      </div>

      {/* Progress Bar vs Estimate */}
      {estimatedHoursNum > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Tiến độ thời gian làm:</span>
            <span className={`font-semibold ${isOverBudget ? "text-red-500" : "text-emerald-600"}`}>
              {progressPct.toFixed(0)}% {isOverBudget && "(Vượt thời gian ước tính!)"}
            </span>
          </div>
          <Progress
            value={progressPct}
            className={`h-2 ${isOverBudget ? "bg-red-200" : ""}`}
          />
        </div>
      )}

      {/* Manual Time Logging */}
      {canWrite && (
        <div className="flex items-center justify-end pt-1">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm thời gian thủ công</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Nhập số phút đã làm:</label>
                <Input
                  type="number"
                  placeholder="VD: 30 (phút)"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    const mins = parseInt(manualMinutes);
                    if (isNaN(mins) || mins <= 0) {
                      toast.error("Vui lòng nhập số phút hợp lệ");
                      return;
                    }
                    logManualMutation.mutate(mins * 60);
                  }}
                >
                  Ghi nhận thời gian
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
