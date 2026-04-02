export const usersPaths = {
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      displayName: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'displayName', 'avatarUrl', 'description', 'createdAt', 'updatedAt'],
                  },
                },
                required: ['user'],
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
        '404': {
          description: 'User not found',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update current user profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                displayName: { type: 'string', minLength: 1, maxLength: 100 },
                description: { type: 'string', maxLength: 2000, nullable: true },
              },
            },
            examples: {
              sample: {
                summary: 'Update displayName',
                value: { displayName: 'Quang' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      displayName: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'displayName', 'avatarUrl', 'description', 'createdAt', 'updatedAt'],
                  },
                },
                required: ['user'],
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
      },
    },
  },

  '/users/me/avatar/init': {
    post: {
      tags: ['Users'],
      summary: 'Init avatar upload (presigned PUT)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                fileName: { type: 'string' },
                contentType: { type: 'string' },
              },
              required: ['fileName', 'contentType'],
            },
            examples: {
              sample: {
                summary: 'Init avatar upload',
                value: { fileName: 'avatar.png', contentType: 'image/png' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  upload: {
                    type: 'object',
                    properties: {
                      uploadUrl: { type: 'string' },
                      method: { type: 'string', enum: ['PUT'] },
                      headers: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                      },
                      bucket: { type: 'string' },
                      objectKey: { type: 'string' },
                      url: { type: 'string' },
                      expiresIn: { type: 'integer' },
                    },
                    required: ['uploadUrl', 'method', 'headers', 'bucket', 'objectKey', 'url', 'expiresIn'],
                  },
                },
                required: ['upload'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
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
      },
    },
  },

  '/users/me/avatar/commit': {
    post: {
      tags: ['Users'],
      summary: 'Commit avatar upload (save avatarUrl)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                objectKey: { type: 'string' },
              },
              required: ['objectKey'],
            },
            examples: {
              sample: {
                summary: 'Commit avatar upload',
                value: { objectKey: 'avatars/userId/123.png' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      displayName: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'displayName', 'avatarUrl', 'description', 'createdAt', 'updatedAt'],
                  },
                },
                required: ['user'],
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
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
      },
    },
  },

  '/users/search': {
    get: {
      tags: ['Users'],
      summary: 'Search users by email/displayName keyword',
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
          description: 'Ignored by the backend (kept for backward compatibility).',
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
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        displayName: { type: 'string' },
                        avatarUrl: { type: 'string', nullable: true },
                      },
                      required: ['id', 'email', 'displayName', 'avatarUrl'],
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
      },
    },
  },
} as const;
