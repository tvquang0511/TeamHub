// API Types for TeamHub

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface InviteToWorkspaceRequest {
  email: string;
  role?: "ADMIN" | "MEMBER";
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  email?: string;
  displayName?: string;
  joinedAt?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  privacy: "PRIVATE" | "WORKSPACE";
  backgroundColor?: string;
  backgroundLeftColor?: string;
  backgroundRightColor?: string;
  backgroundSplitPct?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDetail extends Board {
  lists: List[];
  members: BoardMember[];
  labels?: Label[];
  actor?: {
    workspaceRole?: "OWNER" | "ADMIN" | "MEMBER";
    boardRole?: "OWNER" | "ADMIN" | "MEMBER";
    isWorkspaceMember?: boolean;
    isBoardMember?: boolean;
    canReadBoard?: boolean;
    canWriteBoard?: boolean;
    canManageBoardMembers?: boolean;
    canDeleteBoard?: boolean;
    canArchiveBoard?: boolean;
    canLeaveBoard?: boolean;
  };
}

export interface BoardMember {
  id: string;
  userId: string;
  boardId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: User;
  joinedAt: string;
}

export interface List {
  id: string;
  name: string;
  boardId: string;
  position: number;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  listId: string;
  position: number;
  dueDate?: string;
  labels?: Label[];
  assignees?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  boardId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface MoveCardRequest {
  toListId: string;
  prevCardId?: string;
  nextCardId?: string;
}

export interface MoveListRequest {
  prevListId?: string;
  nextListId?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface CreateBoardRequest {
  name: string;
  workspaceId: string;
  description?: string;
  backgroundColor?: string;
  backgroundLeftColor?: string;
  backgroundRightColor?: string;
  backgroundSplitPct?: number;
  privacy?: "PRIVATE" | "WORKSPACE";
}

export interface CreateListRequest {
  name: string;
  boardId: string;
}

export interface CreateCardRequest {
  title: string;
  listId: string;
  description?: string;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  dueDate?: string;
}

export interface AddBoardMemberByEmailRequest {
  email: string;
  role?: "ADMIN" | "MEMBER";
}
