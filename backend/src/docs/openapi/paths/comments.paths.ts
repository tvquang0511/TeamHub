import { z } from 'zod';

import { toSchema } from '../components/schemas';

const CommentSchema = z.object({}).passthrough();
const CreateCommentRequestSchema = z.object({
  cardId: z.string().uuid(),
  content: z.string().min(1),
});

export function buildCommentsSchemas() {
  return {
    Comment: toSchema(CommentSchema, 'Comment'),
    CreateCommentRequest: toSchema(CreateCommentRequestSchema, 'CreateCommentRequest'),
  };
}

export const commentsPaths = {
  '/comments': {
    get: {
      tags: ['Comments'],
      summary: 'List comments by card',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'cardId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                  nextCursor: { type: 'string', nullable: true },
                },
                required: ['comments'],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
    post: {
      tags: ['Comments'],
      summary: 'Create comment',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateCommentRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { comment: { $ref: '#/components/schemas/Comment' } },
                required: ['comment'],
              },
            },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/comments/{id}': {
    delete: {
      tags: ['Comments'],
      summary: 'Delete comment',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
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
