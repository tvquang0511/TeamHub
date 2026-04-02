import { z } from 'zod';

import { toSchema } from '../components/schemas';

const AttachmentSchema = z.object({}).passthrough();

const PresignUploadRequestSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
});

const PresignResponseSchema = z.object({
  presign: z.record(z.string(), z.any()),
});

const CommitFileRequestSchema = z.object({
  bucket: z.string(),
  objectKey: z.string(),
  url: z.string().url().optional(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
});

const CreateLinkRequestSchema = z.object({
  linkUrl: z.string().url(),
  linkTitle: z.string().optional(),
});

const CreateCardRefRequestSchema = z.object({
  referencedCardId: z.string().uuid(),
  linkTitle: z.string().optional(),
});

export function buildAttachmentsSchemas() {
  return {
    Attachment: toSchema(AttachmentSchema, 'Attachment'),
    PresignUploadRequest: toSchema(PresignUploadRequestSchema, 'PresignUploadRequest'),
    PresignResponse: toSchema(PresignResponseSchema, 'PresignResponse'),
    CommitFileRequest: toSchema(CommitFileRequestSchema, 'CommitFileRequest'),
    CreateLinkRequest: toSchema(CreateLinkRequestSchema, 'CreateLinkRequest'),
    CreateCardRefRequest: toSchema(CreateCardRefRequestSchema, 'CreateCardRefRequest'),
  };
}

export const attachmentsPaths = {
  '/attachments/cards/{cardId}': {
    get: {
      tags: ['Attachments'],
      summary: 'List attachments of a card',
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
                  attachments: { type: 'array', items: { $ref: '#/components/schemas/Attachment' } },
                },
                required: ['attachments'],
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
  '/attachments/cards/{cardId}/presign': {
    post: {
      tags: ['Attachments'],
      summary: 'Presign file upload (PUT URL)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PresignUploadRequest' } },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PresignResponse' } },
          },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/attachments/cards/{cardId}/files': {
    post: {
      tags: ['Attachments'],
      summary: 'Commit file attachment after upload',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CommitFileRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { attachment: { $ref: '#/components/schemas/Attachment' } },
                required: ['attachment'],
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
  '/attachments/cards/{cardId}/links': {
    post: {
      tags: ['Attachments'],
      summary: 'Create link attachment',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateLinkRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { attachment: { $ref: '#/components/schemas/Attachment' } },
                required: ['attachment'],
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
  '/attachments/cards/{cardId}/cards': {
    post: {
      tags: ['Attachments'],
      summary: 'Create card reference attachment',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateCardRefRequest' } },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { attachment: { $ref: '#/components/schemas/Attachment' } },
                required: ['attachment'],
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
  '/attachments/{attachmentId}': {
    delete: {
      tags: ['Attachments'],
      summary: 'Delete attachment',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'attachmentId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
      },
    },
  },
  '/attachments/{attachmentId}/presign-download': {
    post: {
      tags: ['Attachments'],
      summary: 'Presign file download (GET URL)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'attachmentId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PresignResponse' },
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
