import { z } from 'zod';

export const usersPaths = {
  '/users/search': {
    get: {
      tags: ['Users'],
      summary: 'Search users by email prefix (optionally scoped to a workspace) ',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string' },
          example: 'quang',
        },
        {
          name: 'workspaceId',
          in: 'query',
          required: false,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 50 },
          example: 10,
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        displayName: { type: 'string' },
                      },
                      required: ['id', 'email', 'displayName'],
                    },
                  },
                },
                required: ['users'],
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '403': {
          description: 'Forbidden (if workspaceId scoped and not a member)',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },
} as const;

// Avoid unused import lint if no schemas needed yet.
void z;
