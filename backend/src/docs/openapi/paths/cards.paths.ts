import { z } from "zod";

import { toSchema } from "../components/schemas";

const CardSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  position: z.number(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export function buildCardsSchemas() {
  return {
    Card: toSchema(CardSchema, "Card"),
  };
}

export const cardsPaths = {
  "/cards": {
    get: {
      tags: ["Cards"],
      summary: "List cards in a list",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "listId",
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
                  cards: { type: "array", items: { $ref: "#/components/schemas/Card" } },
                },
                required: ["cards"],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Cards"],
      summary: "Create a card",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                listId: { type: "string", format: "uuid" },
                title: { type: "string" },
                description: { type: "string" },
                dueAt: { type: "string", format: "date-time" },
                position: { type: "number" },
              },
              required: ["listId", "title"],
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
                  card: { $ref: "#/components/schemas/Card" },
                },
                required: ["card"],
              },
            },
          },
        },
      },
    },
  },
  "/cards/{id}": {
    get: {
      tags: ["Cards"],
      summary: "Get card detail",
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
                  card: { $ref: "#/components/schemas/Card" },
                },
                required: ["card"],
              },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Cards"],
      summary: "Update / move card",
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
                title: { type: "string" },
                description: { type: "string", nullable: true },
                dueAt: { type: "string", format: "date-time", nullable: true },
                position: { type: "number", nullable: true },
                archived: { type: "boolean" },
                listId: { type: "string", format: "uuid" },
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
                  card: { $ref: "#/components/schemas/Card" },
                },
                required: ["card"],
              },
            },
          },
        },
      },
    },
  },
  "/cards/{id}/move": {
    post: {
      tags: ["Cards"],
      summary: "Move / reorder a card using prev/next anchors",
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
                listId: { type: "string", format: "uuid" },
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
                  card: { $ref: "#/components/schemas/Card" },
                },
                required: ["card"],
              },
            },
          },
        },
      },
    },
  },
} as const;
