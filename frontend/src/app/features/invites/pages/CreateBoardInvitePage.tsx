import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Deprecated: Board invites were removed. Board membership is now managed via direct add in the board members dialog.
 */
export const CreateBoardInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  useEffect(() => {
    // Redirect to board page.
    navigate(boardId ? `/boards/${boardId}` : "/workspaces", { replace: true });
  }, [boardId, navigate]);

  return null;
};
