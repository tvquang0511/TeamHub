import React from "react";
import { User, X, Calendar, Tag, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import type { BoardDetail } from "../../../types/api";

export interface BoardFilterState {
  search: string;
  onlyMyCards: boolean;
  assigneeIds: string[];
  labelIds: string[];
  dueDate: "all" | "overdue" | "due_today" | "due_this_week" | "no_due";
}

interface BoardFilterBarProps {
  board: BoardDetail;
  filters: BoardFilterState;
  onFilterChange: (filters: BoardFilterState) => void;
}

export const BoardFilterBar: React.FC<BoardFilterBarProps> = ({
  board,
  filters,
  onFilterChange,
}) => {
  const members = board.members ?? [];
  const labels = board.labels ?? [];

  const isFiltered =
    filters.search ||
    filters.onlyMyCards ||
    filters.assigneeIds.length > 0 ||
    filters.labelIds.length > 0 ||
    filters.dueDate !== "all";

  const clearFilters = () => {
    onFilterChange({
      search: "",
      onlyMyCards: false,
      assigneeIds: [],
      labelIds: [],
      dueDate: "all",
    });
  };

  const toggleAssignee = (userId: string) => {
    const exists = filters.assigneeIds.includes(userId);
    const next = exists
      ? filters.assigneeIds.filter((id) => id !== userId)
      : [...filters.assigneeIds, userId];
    onFilterChange({ ...filters, assigneeIds: next });
  };

  const toggleLabel = (labelId: string) => {
    const exists = filters.labelIds.includes(labelId);
    const next = exists
      ? filters.labelIds.filter((id) => id !== labelId)
      : [...filters.labelIds, labelId];
    onFilterChange({ ...filters, labelIds: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-background/80 border-b backdrop-blur-xs text-xs">
      {/* Search Input */}
      <div className="relative min-w-[180px] max-w-xs">
        <Input
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          placeholder="Tìm kiếm thẻ..."
          className="h-8 text-xs pr-7"
        />
        {filters.search ? (
          <button
            onClick={() => onFilterChange({ ...filters, search: "" })}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Quick Filter: My Cards */}
      <Button
        variant={filters.onlyMyCards ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange({ ...filters, onlyMyCards: !filters.onlyMyCards })}
        className="h-8 text-xs"
      >
        <User className="mr-1.5 h-3.5 w-3.5" />
        Thẻ của tôi
      </Button>

      {/* Assignee Filter Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.assigneeIds.length > 0 ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs border-dashed"
          >
            <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Thành viên
            {filters.assigneeIds.length > 0 ? (
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] bg-primary text-primary-foreground">
                {filters.assigneeIds.length}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 text-xs" align="start">
          <div className="font-semibold text-muted-foreground mb-2 px-2">Lọc theo thành viên</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {members.map((m) => {
              const selected = filters.assigneeIds.includes(m.userId);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleAssignee(m.userId)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-5 w-5">
                      {m.user?.avatarUrl ? <AvatarImage src={m.user.avatarUrl} /> : null}
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {m.user?.displayName?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{m.user?.displayName}</span>
                  </div>
                  {selected ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Label Filter Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.labelIds.length > 0 ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs border-dashed"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Nhãn (Labels)
            {filters.labelIds.length > 0 ? (
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] bg-primary text-primary-foreground">
                {filters.labelIds.length}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2 text-xs" align="start">
          <div className="font-semibold text-muted-foreground mb-2 px-2">Lọc theo nhãn</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {labels.map((l) => {
              const selected = filters.labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => toggleLabel(l.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="truncate">{l.name}</span>
                  </div>
                  {selected ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Due Date Filter Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.dueDate !== "all" ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs border-dashed"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Hạn chót
            {filters.dueDate !== "all" ? (
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] bg-primary text-primary-foreground">
                !
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 text-xs" align="start">
          <div className="font-semibold text-muted-foreground mb-2 px-2">Trạng thái hạn chót</div>
          <div className="space-y-1">
            {[
              { id: "all", label: "Tất cả" },
              { id: "overdue", label: "⚠️ Quá hạn" },
              { id: "due_today", label: "📅 Hạn hôm nay" },
              { id: "due_this_week", label: "🗓️ Hạn tuần này" },
              { id: "no_due", label: "⚪ Không có hạn" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => onFilterChange({ ...filters, dueDate: opt.id as any })}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
              >
                <span>{opt.label}</span>
                {filters.dueDate === opt.id ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Filters Button */}
      {isFiltered ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
};
