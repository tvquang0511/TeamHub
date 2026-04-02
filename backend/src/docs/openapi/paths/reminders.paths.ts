import { z } from 'zod';

import { toSchema } from '../components/schemas';

const ReminderJobSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  userId: z.string().uuid(),

  remindAt: z.string().datetime(),
  status: z.enum(['PENDING', 'SENT', 'CANCELED', 'FAILED']),

  attempts: z.number().int(),
  lastError: z.string().nullable().optional(),
  sentAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export function buildRemindersSchemas() {
  return {
    ReminderJob: toSchema(ReminderJobSchema, 'ReminderJob'),
  };
}

export const remindersPaths = {
  '/cards/{id}/reminders': {
    get: {
      tags: ['Reminders'],
      summary: "List the current user's reminders for a card",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
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
                  reminders: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ReminderJob' },
                  },
                },
                required: ['reminders'],
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['Reminders'],
      summary: 'Set a reminder for the current user on a card',
      description:
        'Creates a reminder job (PENDING). Implementation may also enqueue a delayed BullMQ job at remindAt.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                remindAt: { type: 'string', format: 'date-time' },
              },
              required: ['remindAt'],
            },
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
                  reminder: { $ref: '#/components/schemas/ReminderJob' },
                },
                required: ['reminder'],
              },
            },
          },
        },
      },
    },
  },
  '/cards/{id}/reminders/{reminderJobId}': {
    delete: {
      tags: ['Reminders'],
      summary: 'Cancel a reminder job',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'reminderJobId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
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
              examples: {
                ok: { value: { ok: true } },
              },
            },
          },
        },
      },
    },
  },
} as const;
