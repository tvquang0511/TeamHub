import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  LayoutGrid,
  Moon,
  Search,
  Sun,
  User,
} from "lucide-react";

import { useTheme } from "../../providers/ThemeProvider";
import { workspacesApi } from "../../api/workspaces.api";
import type { Workspace } from "../../types/api";
import { Dialog, DialogContent } from "../ui/dialog";

export const CommandMenu: React.FC<{ iconOnly?: boolean }> = ({ iconOnly }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch workspaces for quick navigation
  const { data: workspaces } = useQuery({
    queryKey: ["workspaces", "command-menu"],
    queryFn: () => workspacesApi.getAll(),
    enabled: open,
  });

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <>
      {/* Quick trigger button for TopBar */}
      {iconOnly ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Search (Ctrl + K)"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group relative flex h-9 w-full items-center justify-between rounded-full border border-border/60 bg-muted/30 px-3.5 text-xs text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted/70 hover:text-foreground shadow-2xs"
          title="Quick Search (Ctrl + K)"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="truncate">Tìm kiếm hoặc nhảy tới...</span>
          </div>
          <kbd className="pointer-events-none select-none items-center gap-0.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-2xs group-hover:border-border flex">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-xl border bg-popover/95 backdrop-blur-md shadow-2xl">
          <Command className="w-full rounded-lg bg-transparent">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Nhập tên trang, workspace hoặc lệnh..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Command.List className="max-h-[320px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả phù hợp.
              </Command.Empty>

              <Command.Group heading="Điều hướng chính" className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                <Command.Item
                  onSelect={() => handleSelect(() => navigate("/workspaces"))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span>Danh sách Workspaces</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => handleSelect(() => navigate("/profile"))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <User className="h-4 w-4 text-emerald-500" />
                  <span>Trang thông tin cá nhân (Profile)</span>
                </Command.Item>
              </Command.Group>

              {workspaces && workspaces.length > 0 && (
                <Command.Group heading="Workspaces của tôi" className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">
                  {workspaces.map((ws: Workspace) => (
                    <Command.Item
                      key={ws.id}
                      onSelect={() => handleSelect(() => navigate(`/workspaces/${ws.id}`))}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <LayoutGrid className="h-4 w-4 text-indigo-500" />
                      <span className="font-medium">{ws.name}</span>
                      {ws.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          - {ws.description}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Giao diện & Theme" className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">
                <Command.Item
                  onSelect={() => handleSelect(() => setTheme("light"))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Chuyển sang Giao diện Sáng (Light Mode)</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => handleSelect(() => setTheme("dark"))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Moon className="h-4 w-4 text-purple-400" />
                  <span>Chuyển sang Giao diện Tối (Dark Mode)</span>
                </Command.Item>
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground bg-muted/30">
              <div className="flex items-center gap-2">
                <span>Dùng phím mũi tên <kbd className="rounded border bg-background px-1">↑</kbd> <kbd className="rounded border bg-background px-1">↓</kbd> để di chuyển</span>
              </div>
              <div>
                <kbd className="rounded border bg-background px-1">Esc</kbd> để đóng
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
