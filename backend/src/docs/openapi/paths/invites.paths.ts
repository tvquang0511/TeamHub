import { z } from 'zod';
import { toSchema } from '../components/schemas';

const CreateWorkspaceInviteRequestSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
});

const CreateWorkspaceInviteResponseSchema = z.object({
  invite: z.object({
    id: z.string(),
    email: z.string().email(),
    token: z.string(),
    expiresAt: z.string(),
  }),
});

const AcceptInviteResponseSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export function buildInvitesSchemas() {
  return {
    CreateWorkspaceInviteRequest: toSchema(
      CreateWorkspaceInviteRequestSchema,
      'CreateWorkspaceInviteRequest',
    ),
    CreateWorkspaceInviteResponse: toSchema(
      CreateWorkspaceInviteResponseSchema,
      'CreateWorkspaceInviteResponse',
    ),
    AcceptInviteResponse: toSchema(AcceptInviteResponseSchema, 'AcceptInviteResponse'),
  };
}

export const invitesPaths = {
  '/workspaces/{id}/invites': {
    post: {
      tags: ['Invites'],
      summary: 'Create workspace invite (OWNER/ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateWorkspaceInviteRequest' },
            examples: {
              sample: {
                summary: 'Invite payload',
                value: {
                  email: 'invitee@mail.com',
                  expiresAt: '2026-12-31T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkspaceInviteResponse' },
              examples: {
                sample: {
                  summary: 'Invite created (MVP returns token)',
                  value: {
                    invite: {
                      id: 'uuid',
                      email: 'invitee@mail.com',
                      token: 'token',
                      expiresAt: '2026-12-31T00:00:00.000Z',
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '403': {
          description: 'Forbidden (not OWNER/ADMIN)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/invites/{token}/accept': {
    post: {
      tags: ['Invites'],
      summary: 'Accept workspace invite (strict email match)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'token',
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AcceptInviteResponse' },
              examples: {
                sample: {
                  summary: 'Accepted',
                  value: { workspace: { id: 'uuid', name: 'My Workspace' } },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid/expired invite',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '409': {
          description: 'Already member',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
} as const;
