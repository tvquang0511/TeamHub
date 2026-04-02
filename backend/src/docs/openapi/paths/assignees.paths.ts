import { z } from 'zod';

import { toSchema } from '../components/schemas';

const AssigneeSchema = z.object({}).passthrough();

export function buildAssigneesSchemas() {
  return {
    Assignee: toSchema(AssigneeSchema, 'Assignee'),
  };
}

export const assigneesPaths = {
  '/assignees/cards/{cardId}/assignees': {
    get: {
      tags: ['Assignees'],
      summary: 'List assignees by card',
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
                  assignees: { type: 'array', items: { $ref: '#/components/schemas/Assignee' } },
                },
                required: ['assignees'],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/assignees/cards/{cardId}/assignees/me': {
    post: {
      tags: ['Assignees'],
      summary: 'Assign current user to card',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { assignee: { $ref: '#/components/schemas/Assignee' } },
                    required: ['assignee'],
                  },
                  {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                    required: ['ok'],
                  },
                ],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Assignees'],
      summary: 'Unassign current user from card',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
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
  '/assignees/cards/{cardId}/assignees/{userId}': {
    post: {
      tags: ['Assignees'],
      summary: 'Assign a user to card',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'cardId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { assignee: { $ref: '#/components/schemas/Assignee' } },
                    required: ['assignee'],
                  },
                  {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                    required: ['ok'],
                  },
                ],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Assignees'],
      summary: 'Unassign a user from card',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'cardId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
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
