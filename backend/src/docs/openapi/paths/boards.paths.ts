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

export function buildBoardsSchemas() {
  return {
    Board: toSchema(BoardSchema, "Board"),
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
  },
} as const;
