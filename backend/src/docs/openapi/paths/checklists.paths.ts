import { z } from 'zod';

import { toSchema } from '../components/schemas';

const ChecklistSchema = z.object({}).passthrough();
const ChecklistItemSchema = z.object({}).passthrough();

const CreateChecklistRequestSchema = z.object({
  title: z.string().min(1).max(200),
});

const UpdateChecklistRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

const CreateChecklistItemRequestSchema = z.object({
  title: z.string().min(1).max(200),
});

const UpdateChecklistItemRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    isDone: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

export function buildChecklistsSchemas() {
  return {
    Checklist: toSchema(ChecklistSchema, 'Checklist'),
    ChecklistItem: toSchema(ChecklistItemSchema, 'ChecklistItem'),
    CreateChecklistRequest: toSchema(CreateChecklistRequestSchema, 'CreateChecklistRequest'),
    UpdateChecklistRequest: toSchema(UpdateChecklistRequestSchema, 'UpdateChecklistRequest'),
    CreateChecklistItemRequest: toSchema(CreateChecklistItemRequestSchema, 'CreateChecklistItemRequest'),
    UpdateChecklistItemRequest: toSchema(UpdateChecklistItemRequestSchema, 'UpdateChecklistItemRequest'),
  };
}

export const checklistsPaths = {
  '/checklists/cards/{cardId}/checklists': {
    get: {
      tags: ['Checklists'],
      summary: 'List checklists of a card',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  checklists: { type: 'array', items: { $ref: '#/components/schemas/Checklist' } },
                },
                required: ['checklists'],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
    post: {
      tags: ['Checklists'],
      summary: 'Create checklist on a card',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateChecklistRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { checklist: { $ref: '#/components/schemas/Checklist' } },
                required: ['checklist'],
              },
            },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/checklists/checklists/{checklistId}': {
    patch: {
      tags: ['Checklists'],
      summary: 'Update checklist',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'checklistId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateChecklistRequest' } },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { checklist: { $ref: '#/components/schemas/Checklist' } },
                required: ['checklist'],
              },
            },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Checklists'],
      summary: 'Delete checklist',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'checklistId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/checklists/checklists/{checklistId}/items': {
    post: {
      tags: ['Checklists'],
      summary: 'Create checklist item',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'checklistId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateChecklistItemRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { item: { $ref: '#/components/schemas/ChecklistItem' } },
                required: ['item'],
              },
            },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/checklists/items/{itemId}': {
    patch: {
      tags: ['Checklists'],
      summary: 'Update checklist item',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateChecklistItemRequest' } },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { item: { $ref: '#/components/schemas/ChecklistItem' } },
                required: ['item'],
              },
            },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Checklists'],
      summary: 'Delete checklist item',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
};
