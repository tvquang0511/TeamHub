import { z } from 'zod';
import { toSchema } from '../components/schemas';

const CreateWorkspaceInviteRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  expiresAt: z.string().datetime().optional(),
});

const CreateWorkspaceInviteResponseSchema = z.object({
  invite: z.object({
    id: z.string(),
    email: z.string().email(),
    token: z.string(),
    expiresAt: z.string(),
    role: z.enum(['ADMIN', 'MEMBER']),
  }),
});

const AcceptInviteResponseSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const WorkspaceInviteSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
});

const ListWorkspaceInvitesResponseSchema = z.object({
  invites: z.array(WorkspaceInviteSchema),
});

// Inbox (topbar notifications)
const WorkspaceInviteInboxItemSchema = z.object({
  invite: WorkspaceInviteSchema,
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const ListMyWorkspaceInvitesResponseSchema = z.object({
  invites: z.array(WorkspaceInviteInboxItemSchema),
});

const GetInviteByTokenResponseSchema = z.object({
  invite: WorkspaceInviteSchema,
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const OkResponseSchema = z.object({
  ok: z.boolean(),
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
    WorkspaceInvite: toSchema(WorkspaceInviteSchema, 'WorkspaceInvite'),
    ListWorkspaceInvitesResponse: toSchema(
      ListWorkspaceInvitesResponseSchema,
      'ListWorkspaceInvitesResponse',
    ),
    ListMyWorkspaceInvitesResponse: toSchema(
      ListMyWorkspaceInvitesResponseSchema,
      'ListMyWorkspaceInvitesResponse',
    ),
    GetInviteByTokenResponse: toSchema(
      GetInviteByTokenResponseSchema,
      'GetInviteByTokenResponse',
    ),
    OkResponse: toSchema(OkResponseSchema, 'OkResponse'),
  };
}

export const invitesPaths = {
  '/invites/inbox/workspaces': {
    get: {
      tags: ['Invites'],
      summary: 'List my pending workspace invites (inbox)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ListMyWorkspaceInvitesResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/invites/inbox/workspaces/{inviteId}/accept': {
    post: {
      tags: ['Invites'],
      summary: 'Accept a workspace invite from inbox',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AcceptInviteResponse' } },
          },
        },
        '400': {
          description: 'Invalid/expired invite',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '404': {
          description: 'Invite not found',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '409': {
          description: 'Already member',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/invites/inbox/workspaces/{inviteId}/decline': {
    post: {
      tags: ['Invites'],
      summary: 'Decline a workspace invite from inbox',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OkResponse' },
              examples: { sample: { value: { ok: true } } },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        '404': {
          description: 'Invite not found',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
  },

  '/invites/workspaces/{workspaceId}': {
    post: {
      tags: ['Invites'],
      summary: 'Create workspace invite (OWNER/ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'workspaceId',
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
          description: 'Forbidden (not OWNER/ADMIN)',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
    get: {
      tags: ['Invites'],
      summary: 'List workspace invites (OWNER/ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'workspaceId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ListWorkspaceInvitesResponse' },
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

  '/invites/workspaces/{workspaceId}/{inviteId}': {
    delete: {
      tags: ['Invites'],
      summary: 'Revoke workspace invite (OWNER/ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'workspaceId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
        {
          name: 'inviteId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'uuid',
        },
      ],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OkResponse' },
              examples: {
                sample: { value: { ok: true } },
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
        '404': {
          description: 'Invite not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/invites/{token}': {
    get: {
      tags: ['Invites'],
      summary: 'Get invite details by token (workspace members)',
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
              schema: { $ref: '#/components/schemas/GetInviteByTokenResponse' },
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
          description: 'Forbidden (not a workspace member)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Invite not found',
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
