import { z } from 'zod';

import { toSchema } from '../components/schemas';

const LabelSchema = z.object({}).passthrough();

const CreateLabelRequestSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable().optional(),
});

const UpdateLabelRequestSchema = z
  .object({
    name: z.string().optional(),
    color: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

export function buildLabelsSchemas() {
  return {
    Label: toSchema(LabelSchema, 'Label'),
    CreateLabelRequest: toSchema(CreateLabelRequestSchema, 'CreateLabelRequest'),
    UpdateLabelRequest: toSchema(UpdateLabelRequestSchema, 'UpdateLabelRequest'),
  };
}

export const labelsPaths = {
  '/labels': {
    get: {
      tags: ['Labels'],
      summary: 'List labels by board',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'boardId',
          in: 'query',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  labels: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Label' },
                  },
                },
                required: ['labels'],
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
    post: {
      tags: ['Labels'],
      summary: 'Create label',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateLabelRequest' },
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
                properties: {
                  label: { $ref: '#/components/schemas/Label' },
                },
                required: ['label'],
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
  '/labels/{id}': {
    patch: {
      tags: ['Labels'],
      summary: 'Update label',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateLabelRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label: { $ref: '#/components/schemas/Label' },
                },
                required: ['label'],
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
      tags: ['Labels'],
      summary: 'Delete label',
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
              schema: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
                },
                required: ['ok'],
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
};
