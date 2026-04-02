import { z } from "zod";

import { toSchema } from "../components/schemas";

const CardSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  isDone: z.boolean().optional(),
  position: z.number(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Present in GET /cards/:id responses
  list: z
    .object({
      board: z.object({
        id: z.string().uuid(),
        workspaceId: z.string().uuid(),
        visibility: z.enum(["WORKSPACE", "PRIVATE"]).optional(),
      }),
    })
    .optional(),
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
    delete: {
      tags: ["Cards"],
      summary: "Archive (soft-delete) a card",
      description: "Sets card.archivedAt.",
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

  "/cards/{id}/due-date": {
    patch: {
      tags: ["Cards"],
      summary: "Set / clear card due date",
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
                dueAt: { type: "string", format: "date-time", nullable: true },
              },
              required: ["dueAt"],
            },
            examples: {
              set: { value: { dueAt: "2026-04-10T09:00:00.000Z" } },
              clear: { value: { dueAt: null } },
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
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not found" },
      },
    },
  },

  "/cards/{id}/done": {
    patch: {
      tags: ["Cards"],
      summary: "Mark card done / undone",
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
                isDone: { type: "boolean" },
              },
              required: ["isDone"],
            },
            examples: {
              done: { value: { isDone: true } },
              undone: { value: { isDone: false } },
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
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not found" },
      },
    },
  },

  "/cards/{id}/labels": {
    get: {
      tags: ["Cards"],
      summary: "List labels attached to a card",
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
                  labels: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Label" },
                  },
                },
                required: ["labels"],
              },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not found" },
      },
    },
  },

  "/cards/{id}/labels/{labelId}": {
    post: {
      tags: ["Cards"],
      summary: "Attach a label to a card",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "labelId",
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
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      label: { $ref: "#/components/schemas/Label" },
                    },
                    required: ["label"],
                  },
                  {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                    },
                    required: ["ok"],
                  },
                ],
              },
              examples: {
                attached: { value: { label: { id: "uuid" } } },
                alreadyAttached: { value: { ok: true } },
              },
            },
          },
        },
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not found" },
      },
    },
    delete: {
      tags: ["Cards"],
      summary: "Detach a label from a card",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "labelId",
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
              examples: { ok: { value: { ok: true } } },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Not found" },
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
