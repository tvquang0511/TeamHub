import { z } from 'zod';

import { toSchema } from '../components/schemas';

const BoardAnalyticsResponseSchema = z.record(z.string(), z.any());

export function buildAnalyticsSchemas() {
  return {
    BoardAnalyticsResponse: toSchema(BoardAnalyticsResponseSchema, 'BoardAnalyticsResponse'),
  };
}

export const analyticsPaths = {
  '/boards/{id}/analytics': {
    get: {
      tags: ['Analytics'],
      summary: 'Get board analytics',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BoardAnalyticsResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
};
