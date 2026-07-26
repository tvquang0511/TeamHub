import React, { useMemo, useState } from "react";
import { Search, Table as TableIcon, CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";
import type { BoardDetail, Card } from "../../../types/api";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";

interface BoardTableViewProps {
  board: BoardDetail;
  onCardClick: (cardId: string) => void;
}

export const BoardTableView: React.FC<BoardTableViewProps> = ({ board, onCardClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "in_progress" | "overdue">("all");

  // Flatten all cards with list info
  const allCards = useMemo(() => {
    const items: Array<{ card: Card; listName: string }> = [];
    board.lists.forEach((list) => {
      list.cards.forEach((card) => {
        items.push({ card, listName: list.name });
      });
    });
    return items;
  }, [board]);

  const filteredCards = useMemo(() => {
    return allCards.filter(({ card }) => {
      // Search term filter
      const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Status filter
      const isOverdue = card.dueAt && new Date(card.dueAt) < new Date() && !card.isDone;
      if (statusFilter === "done") return card.isDone;
      if (statusFilter === "in_progress") return !card.isDone && !isOverdue;
      if (statusFilter === "overdue") return isOverdue;

      return true;
    });
  }, [allCards, searchTerm, statusFilter]);

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl overflow-hidden m-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b px-6 py-4 bg-muted/30 gap-4">
        <div className="flex items-center gap-3">
          <TableIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Bảng dữ liệu hàng ngang (Table View)</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
            {filteredCards.length} / {allCards.length} thẻ
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Lọc tên thẻ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-background"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-full border border-border/40 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === "all" ? "bg-background font-semibold text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === "in_progress" ? "bg-background font-semibold text-blue-600 shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đang làm
            </button>
            <button
              onClick={() => setStatusFilter("done")}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === "done" ? "bg-background font-semibold text-emerald-600 shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoàn thành
            </button>
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === "overdue" ? "bg-background font-semibold text-red-600 shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quá hạn
            </button>
          </div>
        </div>
      </div>

      {/* Table Data View */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 text-muted-foreground font-semibold sticky top-0 border-b border-border/40">
            <tr>
              <th className="px-6 py-3">Tiêu đề Card</th>
              <th className="px-4 py-3">Danh sách (List)</th>
              <th className="px-4 py-3">Nhãn (Labels)</th>
              <th className="px-4 py-3">Hạn chót</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 bg-card/40">
            {filteredCards.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                  Không tìm thấy thẻ nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredCards.map(({ card, listName }) => {
                const isOverdue = card.dueAt && new Date(card.dueAt) < new Date() && !card.isDone;

                return (
                  <tr
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    className="hover:bg-muted/60 transition-colors cursor-pointer group"
                  >
                    {/* Title & Checklist info */}
                    <td className="px-6 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {card.isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : isOverdue ? (
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span className="group-hover:text-primary transition-colors text-sm">
                          {card.title}
                        </span>
                      </div>
                    </td>

                    {/* List Name */}
                    <td className="px-4 py-3 text-muted-foreground">
                      <Badge variant="outline" className="font-normal bg-muted/40">
                        {listName}
                      </Badge>
                    </td>

                    {/* Labels */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(card.labels || []).map((l) => (
                          <span
                            key={l.id}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: l.color || "#64748B" }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {card.dueAt ? (
                        <span className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(card.dueAt).toLocaleDateString("vi-VN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {card.isDone ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30">
                          Đã hoàn thành
                        </Badge>
                      ) : isOverdue ? (
                        <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/30">
                          Quá hạn
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/30">
                          Đang thực hiện
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
