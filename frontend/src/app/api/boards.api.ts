import { httpClient } from "./http";
import type {
  Board,
  BoardDetail,
  BoardMember,
  Card,
  Label,
  List,
  CreateBoardRequest,
  AddBoardMemberByEmailRequest,
} from "../types/api";

type BoardEnvelope = { board: any };
type MembersEnvelope = { members: any[] };
type BoardDetailEnvelope = {
  board: any;
  lists: any[];
  cards: any[];
  members: any[];
  labels: any[];
};

const mapBoard = (b: any): Board => {
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? undefined,
    workspaceId: b.workspaceId,
    privacy: b.visibility === "WORKSPACE" ? "WORKSPACE" : "PRIVATE",
    // Prefer camelCase from backend; fallback to snake_case if an older/alternate serializer is used.
    backgroundColor: (b.backgroundColor ?? b.background_color) ?? undefined,
    createdAt: b.createdAt ?? new Date().toISOString(),
    updatedAt: b.updatedAt ?? new Date().toISOString(),
  };
};

const mapMember = (m: any): BoardMember => ({
  id: m.id,
  userId: m.userId,
  boardId: m.boardId,
  role: m.role,
  user: {
    id: m.user?.id || m.userId,
    email: m.user?.email || "",
    displayName: m.user?.displayName || "",
  },
  joinedAt: m.createdAt ?? new Date().toISOString(),
});

const mapList = (l: any, cards: Card[]): List => ({
  id: l.id,
  name: l.name,
  boardId: l.boardId,
  position: typeof l.position === "number" ? l.position : Number(l.position ?? 0),
  cards,
  createdAt: l.createdAt ?? new Date().toISOString(),
  updatedAt: l.updatedAt ?? new Date().toISOString(),
});

const mapCard = (c: any): Card => ({
  id: c.id,
  title: c.title,
  description: c.description ?? undefined,
  listId: c.listId,
  position: typeof c.position === "number" ? c.position : Number(c.position ?? 0),
  dueDate: c.dueAt ?? undefined,
  labels: [],
  assignees: [],
  createdAt: c.createdAt ?? new Date().toISOString(),
  updatedAt: c.updatedAt ?? new Date().toISOString(),
});

const mapLabel = (l: any): Label => ({
  id: l.id,
  name: l.name,
  color: l.color,
  boardId: l.boardId ?? "",
});

export const boardsApi = {
  // Get board detail (includes lists, cards, members, labels)
  getDetail: async (id: string): Promise<BoardDetail> => {
    const response = await httpClient.get<BoardDetailEnvelope>(`/boards/${id}/detail`);
    const { board, lists, cards, members, labels } = response.data;

    const mappedCards = (cards || []).map(mapCard);
    const cardsByList = new Map<string, Card[]>();
    for (const c of mappedCards) {
      const arr = cardsByList.get(c.listId) || [];
      arr.push(c);
      cardsByList.set(c.listId, arr);
    }

    const mappedLists = (lists || []).map((l) =>
      mapList(l, (cardsByList.get(l.id) || []).sort((a, b) => a.position - b.position))
    );

    return {
      ...mapBoard(board),
      lists: mappedLists.sort((a, b) => a.position - b.position),
      members: (members || []).map(mapMember),
      labels: (labels || []).map(mapLabel),
      actor: board?.actor,
    };
  },

  // Get board by ID
  getById: async (id: string): Promise<Board> => {
    const response = await httpClient.get<BoardEnvelope>(`/boards/${id}`);
    return mapBoard(response.data.board);
  },

  // Create board
  create: async (data: CreateBoardRequest): Promise<Board> => {
    const response = await httpClient.post<BoardEnvelope>("/boards", {
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      visibility: data.privacy === "WORKSPACE" ? "WORKSPACE" : "PRIVATE",
      backgroundColor: data.backgroundColor,
      position: undefined,
    });
    return mapBoard(response.data.board);
  },

  // Update board
  update: async (
    id: string,
    data: Partial<CreateBoardRequest>
  ): Promise<Board> => {
    const response = await httpClient.patch<BoardEnvelope>(`/boards/${id}`, {
      name: data.name,
      description: data.description ?? undefined,
      visibility:
        data.privacy === undefined
          ? undefined
          : data.privacy === "WORKSPACE"
            ? "WORKSPACE"
            : "PRIVATE",
      backgroundColor:
        data.backgroundColor === undefined ? undefined : data.backgroundColor,
      archived: undefined,
      position: undefined,
    });
    return mapBoard(response.data.board);
  },

  // Delete board
  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/boards/${id}`);
  },

  // Get board members
  getMembers: async (id: string): Promise<BoardMember[]> => {
    const response = await httpClient.get<MembersEnvelope>(`/boards/${id}/members`);
    return (response.data.members || []).map(mapMember);
  },

  // Add member by email
  addMemberByEmail: async (
    boardId: string,
    data: AddBoardMemberByEmailRequest
  ): Promise<BoardMember> => {
    const response = await httpClient.post<BoardMember>(
      `/boards/${boardId}/members/by-email`,
      data
    );
    return response.data;
  },

  // Remove member
  removeMember: async (boardId: string, userId: string): Promise<void> => {
    await httpClient.delete(`/boards/${boardId}/members/${userId}`);
  },

  // Update member role
  updateMemberRole: async (
    boardId: string,
    userId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<BoardMember> => {
    const response = await httpClient.patch<BoardMember>(
      `/boards/${boardId}/members/${userId}`,
      { role }
    );
    return response.data;
  },
};
