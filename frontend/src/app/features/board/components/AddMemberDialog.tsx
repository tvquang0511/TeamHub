import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { boardsApi } from "../../../api/boards.api";
import { usersApi } from "../../../api/users.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Search, UserPlus } from "lucide-react";
// toast placeholder (wire real toast later)
import type { User } from "../../../types/api";

interface AddMemberDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  boardId,
  open,
  onOpenChange,
}) => {
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();

  const addMemberMutation = useMutation({
    mutationFn: (userEmail: string) =>
      boardsApi.addMemberByEmail(boardId, { email: userEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      setEmail("");
      setSearchQuery("");
      setSearchResults([]);
      onOpenChange(false);
      // toast: added
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error?.message || "Không thể thêm thành viên");
    },
  });

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await usersApi.search(searchQuery, { limit: 5 });
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addMemberMutation.mutate(email);
    }
  };

  const handleSelectUser = (user: User) => {
    addMemberMutation.mutate(user.email);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm thành viên vào board</DialogTitle>
          <DialogDescription>
            Tìm kiếm người dùng hoặc mời qua email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search users */}
          <div className="space-y-2">
            <Label>Tìm kiếm người dùng</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="mt-2 rounded-md border">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Đang tìm kiếm...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="flex w-full items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                        disabled={addMemberMutation.isPending}
                      >
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                        <UserPlus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Không tìm thấy người dùng
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Hoặc</span>
            </div>
          </div>

          {/* Add by email */}
          <form onSubmit={handleAddByEmail} className="space-y-2">
            <Label htmlFor="email">Mời qua email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                disabled={addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? "Đang thêm..." : "Thêm"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
