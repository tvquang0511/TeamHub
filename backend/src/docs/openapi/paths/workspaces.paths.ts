import { z } from 'zod';
import { toSchema } from '../components/schemas';

const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(200),
});

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CreateWorkspaceResponseSchema = z.object({
  workspace: WorkspaceSchema,
});

const ListMyWorkspacesResponseSchema = z.object({
  workspaces: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
    }),
  ),
});

const GetWorkspaceDetailResponseSchema = z.object({
  workspace: WorkspaceSchema,
});

const ListMembersResponseSchema = z.object({
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      displayName: z.string(),
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
    }),
  ),
});

export function buildWorkspacesSchemas() {
  return {
    CreateWorkspaceRequest: toSchema(CreateWorkspaceRequestSchema, 'CreateWorkspaceRequest'),
    CreateWorkspaceResponse: toSchema(CreateWorkspaceResponseSchema, 'CreateWorkspaceResponse'),
    ListMyWorkspacesResponse: toSchema(
      ListMyWorkspacesResponseSchema,
      'ListMyWorkspacesResponse',
    ),
    GetWorkspaceDetailResponse: toSchema(
      GetWorkspaceDetailResponseSchema,
      'GetWorkspaceDetailResponse',
    ),
    ListWorkspaceMembersResponse: toSchema(
      ListMembersResponseSchema,
      'ListWorkspaceMembersResponse',
    ),
  };
}

export const workspacesPaths = {
  '/workspaces': {
    post: {
      tags: ['Workspaces'],
      summary: 'Create workspace',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateWorkspaceRequest' },
            examples: {
              sample: {
                summary: 'Create workspace payload',
                value: { name: 'My Workspace' },
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
              schema: { $ref: '#/components/schemas/CreateWorkspaceResponse' },
              examples: {
                sample: {
                  summary: 'Created workspace',
                  value: { workspace: { id: 'uuid', name: 'My Workspace' } },
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
      },
    },
    get: {
      tags: ['Workspaces'],
      summary: 'List my workspaces',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ListMyWorkspacesResponse' },
              examples: {
                sample: {
                  summary: 'My workspaces',
                  value: {
                    workspaces: [{ id: 'uuid', name: 'My Workspace', role: 'OWNER' }],
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
      },
    },
  },

  '/workspaces/{id}': {
    get: {
      tags: ['Workspaces'],
      summary: 'Workspace detail',
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
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetWorkspaceDetailResponse' },
              examples: {
                sample: {
                  summary: 'Workspace detail',
                  value: { workspace: { id: 'uuid', name: 'My Workspace' } },
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
          description: 'Forbidden (not a member)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '404': {
          description: 'Workspace not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/workspaces/{id}/members': {
    get: {
      tags: ['Workspaces'],
      summary: 'List workspace members',
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
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ListWorkspaceMembersResponse' },
              examples: {
                sample: {
                  summary: 'Members list',
                  value: {
                    members: [
                      {
                        id: 'uuid',
                        userId: 'uuid',
                        displayName: 'Quang',
                        role: 'OWNER',
                      },
                    ],
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
          description: 'Forbidden (not a member)',
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
