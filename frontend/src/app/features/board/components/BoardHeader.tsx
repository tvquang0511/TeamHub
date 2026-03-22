import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, Users, Star } from "lucide-react";
import { BoardMembersDialog } from "./BoardMembersDialog";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import type { BoardDetail } from "../../../types/api";

interface BoardHeaderProps {
  board: BoardDetail;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({ board }) => {
  const navigate = useNavigate();
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border-b border-white/20 bg-black/10 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/workspaces/${board.workspaceId}`)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{board.name}</h1>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/20"
            >
              <Star className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Members avatars */}
          <div className="flex -space-x-2">
            {board.members?.slice(0, 5).map((member) => (
              <Avatar
                key={member.id}
                className="border-2 border-white"
                title={member.user.displayName}
              >
                <AvatarFallback className="bg-blue-600 text-xs text-white">
                  {getInitials(member.user.displayName)}
                </AvatarFallback>
              </Avatar>
            ))}
            {board.members && board.members.length > 5 && (
              <Avatar className="border-2 border-white">
                <AvatarFallback className="bg-gray-600 text-xs text-white">
                  +{board.members.length - 5}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMembersOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Thành viên
          </Button>
        </div>
      </div>

      <BoardMembersDialog
        boardId={board.id}
        workspaceId={board.workspaceId}
        open={isMembersOpen}
        onOpenChange={setIsMembersOpen}
      />
    </div>
  );
};
