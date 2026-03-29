import { z } from "zod";

import { toSchema } from "../components/schemas";

const BoardSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  position: z.number().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const BoardMessageSenderSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

const BoardMessageSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
  sender: BoardMessageSenderSchema,
});

export function buildBoardsSchemas() {
  return {
    Board: toSchema(BoardSchema, "Board"),
    BoardMessageSender: toSchema(BoardMessageSenderSchema, "BoardMessageSender"),
    BoardMessage: toSchema(BoardMessageSchema, "BoardMessage"),
  };
}

export const boardsPaths = {
  "/boards": {
    get: {
      tags: ["Boards"],
      summary: "List boards in a workspace",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "workspaceId",
          in: "query",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  boards: { type: "array", items: { $ref: "#/components/schemas/Board" } },
                },
                required: ["boards"],
              },
              examples: {
                ok: {
                  value: {
                    boards: [
                      {
                        id: "8f7b5b7c-3a1f-4c93-8f2a-0fd9b5a1c111",
                        workspaceId: "d0f4b37a-4a21-4a2c-9006-3d2aef1b2a22",
                        name: "Product",
                        description: "Roadmap and delivery",
                        position: 1,
                        archivedAt: null,
                        createdAt: "2026-03-19T00:00:00.000Z",
                        updatedAt: "2026-03-19T00:00:00.000Z",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Boards"],
      summary: "Create a board",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                workspaceId: { type: "string", format: "uuid" },
                name: { type: "string" },
                description: { type: "string" },
                position: { type: "number" },
              },
              required: ["workspaceId", "name"],
            },
            examples: {
              create: {
                value: {
                  workspaceId: "{{workspaceId}}",
                  name: "My Board",
                  description: "Board for MVP",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  board: { $ref: "#/components/schemas/Board" },
                },
                required: ["board"],
              },
            },
          },
        },
      },
    },
  },
  "/boards/{id}": {
    get: {
      tags: ["Boards"],
      summary: "Get board detail",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  board: { $ref: "#/components/schemas/Board" },
                },
                required: ["board"],
              },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Boards"],
      summary: "Update board",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string", nullable: true },
                position: { type: "number", nullable: true },
                archived: { type: "boolean" },
              },
            },
            examples: {
              update: {
                value: {
                  name: "My Board (updated)",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  board: { $ref: "#/components/schemas/Board" },
                },
                required: ["board"],
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ["Boards"],
      summary: "Archive (soft-delete) a board",
      description: "Sets board.archivedAt. Requires board role OWNER/ADMIN.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean" },
                },
                required: ["ok"],
              },
              examples: {
                ok: { value: { ok: true } },
              },
            },
          },
        },
      },
    },
  },
  "/boards/{id}/detail": {
    get: {
      tags: ["Boards"],
      summary: "Get board one-shot payload (board + lists + cards + members + labels)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  board: { $ref: "#/components/schemas/Board" },
                  lists: { type: "array", items: { $ref: "#/components/schemas/List" } },
                  cards: { type: "array", items: { $ref: "#/components/schemas/Card" } },
                  members: { type: "array", items: { type: "object" } },
                  labels: { type: "array", items: { type: "object" } },
                },
                required: ["board", "lists", "cards", "members", "labels"],
              },
            },
          },
        },
      },
    },
  },
  "/boards/{id}/messages": {
    get: {
      tags: ["Boards"],
      summary: "List board chat messages (board members only)",
      description:
        "Returns newest messages first. Use nextCursor for pagination (pass as cursor to fetch older messages).",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "cursor",
          in: "query",
          required: false,
          schema: { type: "string", format: "uuid" },
          description: "Message id cursor (fetch messages older than this message)",
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  messages: { type: "array", items: { $ref: "#/components/schemas/BoardMessage" } },
                  nextCursor: { type: "string", format: "uuid", nullable: true },
                },
                required: ["messages", "nextCursor"],
              },
            },
          },
        },
      },
    },
  },
  "/boards/{id}/members/by-email": {
    post: {
      tags: ["Boards"],
      summary: "Add board member by email",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                role: { type: "string", enum: ["OWNER", "ADMIN", "MEMBER"] },
              },
              required: ["email"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  member: { type: "object" },
                },
                required: ["member"],
              },
            },
          },
        },
      },
    },
  },
} as const;
