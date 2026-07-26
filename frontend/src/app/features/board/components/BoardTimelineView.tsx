import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { BoardDetail, Card } from "../../../types/api";
import { Button } from "../../../components/ui/button";

interface BoardTimelineViewProps {
  board: BoardDetail;
  onCardClick: (cardId: string) => void;
}

export const BoardTimelineView: React.FC<BoardTimelineViewProps> = ({ board, onCardClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate 21 days window (1 week past, 2 weeks future)
  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 7); // 7 days back

    for (let i = 0; i < 21; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const startDateWindow = timelineDays[0];
  const endDateWindow = timelineDays[timelineDays.length - 1];

  // Helper to calculate bar offset and width percentages
  const getCardBarPosition = (card: Card) => {
    if (!startDateWindow || !endDateWindow) return { left: "0%", width: "100%" };

    const totalMs = endDateWindow.getTime() - startDateWindow.getTime();

    const createdTime = new Date(card.createdAt).getTime();
    const dueTime = card.dueAt ? new Date(card.dueAt).getTime() : createdTime + 3 * 24 * 60 * 60 * 1000;

    const clampedStart = Math.max(createdTime, startDateWindow.getTime());
    const clampedEnd = Math.min(dueTime, endDateWindow.getTime());

    const startPct = Math.max(0, ((clampedStart - startDateWindow.getTime()) / totalMs) * 100);
    const endPct = Math.min(100, ((clampedEnd - startDateWindow.getTime()) / totalMs) * 100);

    const widthPct = Math.max(4, endPct - startPct);

    return {
      left: `${startPct.toFixed(2)}%`,
      width: `${widthPct.toFixed(2)}%`,
    };
  };

  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl overflow-hidden m-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Dòng thời gian (Timeline & Gantt)</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
            {startDateWindow?.toLocaleDateString("vi-VN", { month: "short", day: "numeric" })} —{" "}
            {endDateWindow?.toLocaleDateString("vi-VN", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs">
            Hôm nay
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Timeline Header Row (Days) */}
        <div className="flex border-b bg-muted/40 sticky top-0 z-10">
          <div className="w-64 shrink-0 px-4 py-3 font-semibold text-xs text-muted-foreground border-r bg-muted/60">
            Danh sách & Thẻ Kanban
          </div>
          <div className="flex-1 grid grid-cols-21 min-w-[900px]">
            {timelineDays.map((d, idx) => {
              const today = isToday(d);
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center py-2 text-[11px] border-r border-border/30 transition-colors ${
                    today ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className="uppercase text-[10px]">
                    {d.toLocaleDateString("vi-VN", { weekday: "short" })}
                  </span>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${today ? "bg-primary text-primary-foreground font-bold shadow-xs" : ""}`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lists & Cards Timeline Rows */}
        <div className="flex-1 divide-y divide-border/40 overflow-y-auto">
          {board.lists.map((list) => (
            <div key={list.id} className="group/list bg-card/40 hover:bg-card/70 transition-colors">
              {/* List Header Row */}
              <div className="flex items-center px-4 py-2.5 bg-muted/20 border-b border-border/30">
                <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {list.name}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({list.cards.length} cards)
                  </span>
                </span>
              </div>

              {/* Cards Rows */}
              {list.cards.length === 0 ? (
                <div className="flex items-center px-6 py-3 text-xs text-muted-foreground italic">
                  Không có card nào trong danh sách này
                </div>
              ) : (
                list.cards.map((card) => {
                  const pos = getCardBarPosition(card);
                  const isOverdue = card.dueAt && new Date(card.dueAt) < new Date() && !card.isDone;

                  return (
                    <div
                      key={card.id}
                      className="flex items-center border-b border-border/20 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => onCardClick(card.id)}
                    >
                      {/* Left: Card Title Column */}
                      <div className="w-64 shrink-0 px-4 text-xs font-medium text-foreground truncate border-r border-border/30 flex items-center gap-2">
                        {card.isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : isOverdue ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate hover:underline" title={card.title}>
                          {card.title}
                        </span>
                      </div>

                      {/* Right: Timeline Bar Segment */}
                      <div className="flex-1 relative h-7 min-w-[900px] px-2 flex items-center">
                        <div
                          className={`absolute h-6 rounded-lg px-2.5 flex items-center justify-between text-[11px] font-medium text-white shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                            card.isDone
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400"
                              : isOverdue
                              ? "bg-gradient-to-r from-red-500 to-rose-600 border border-red-400 animate-pulse"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400"
                          }`}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          <span className="truncate drop-shadow-xs">{card.title}</span>
                          {card.dueAt && (
                            <span className="text-[10px] opacity-90 shrink-0 ml-1.5 font-mono">
                              {new Date(card.dueAt).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
