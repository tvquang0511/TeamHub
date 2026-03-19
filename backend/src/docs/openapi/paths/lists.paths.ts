import { z } from "zod";

import { toSchema } from "../components/schemas";

const ListSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string(),
  position: z.number(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export function buildListsSchemas() {
  return {
    List: toSchema(ListSchema, "List"),
  };
}

export const listsPaths = {
  "/lists": {
    get: {
      tags: ["Lists"],
      summary: "List lists in a board",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "boardId",
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
                  lists: { type: "array", items: { $ref: "#/components/schemas/List" } },
                },
                required: ["lists"],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Lists"],
      summary: "Create a list",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                boardId: { type: "string", format: "uuid" },
                name: { type: "string" },
                position: { type: "number" },
              },
              required: ["boardId", "name"],
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
                  list: { $ref: "#/components/schemas/List" },
                },
                required: ["list"],
              },
            },
          },
        },
      },
    },
  },
  "/lists/{id}": {
    get: {
      tags: ["Lists"],
      summary: "Get list detail",
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
                  list: { $ref: "#/components/schemas/List" },
                },
                required: ["list"],
              },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Lists"],
      summary: "Update list",
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
                position: { type: "number", nullable: true },
                archived: { type: "boolean" },
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
                  list: { $ref: "#/components/schemas/List" },
                },
                required: ["list"],
              },
            },
          },
        },
      },
    },
  },
  "/lists/{id}/move": {
    post: {
      tags: ["Lists"],
      summary: "Move / reorder a list using prev/next anchors",
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
                prevId: { type: "string", format: "uuid", nullable: true },
                nextId: { type: "string", format: "uuid", nullable: true },
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
                  list: { $ref: "#/components/schemas/List" },
                },
                required: ["list"],
              },
            },
          },
        },
      },
    },
  },
} as const;
