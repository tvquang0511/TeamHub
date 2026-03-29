import { z } from 'zod';
import { toSchema } from '../components/schemas';

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100),
});

const RegisterResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
  }),
});

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
  }),
});

const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

const RefreshResponseSchema = z.object({
  accessToken: z.string(),
});

const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
});

const LogoutResponseSchema = z.object({
  ok: z.boolean(),
});

const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const ForgotPasswordResponseSchema = z.object({
  ok: z.boolean(),
});

const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

const ResetPasswordResponseSchema = z.object({
  ok: z.boolean(),
});

export function buildAuthSchemas() {
  return {
    RegisterRequest: toSchema(RegisterRequestSchema, 'RegisterRequest'),
    RegisterResponse: toSchema(RegisterResponseSchema, 'RegisterResponse'),
    LoginRequest: toSchema(LoginRequestSchema, 'LoginRequest'),
    LoginResponse: toSchema(LoginResponseSchema, 'LoginResponse'),
    RefreshRequest: toSchema(RefreshRequestSchema, 'RefreshRequest'),
    RefreshResponse: toSchema(RefreshResponseSchema, 'RefreshResponse'),
    MeResponse: toSchema(MeResponseSchema, 'MeResponse'),
    LogoutResponse: toSchema(LogoutResponseSchema, 'LogoutResponse'),
    ForgotPasswordRequest: toSchema(ForgotPasswordRequestSchema, 'ForgotPasswordRequest'),
    ForgotPasswordResponse: toSchema(ForgotPasswordResponseSchema, 'ForgotPasswordResponse'),
    ResetPasswordRequest: toSchema(ResetPasswordRequestSchema, 'ResetPasswordRequest'),
    ResetPasswordResponse: toSchema(ResetPasswordResponseSchema, 'ResetPasswordResponse'),
  };
}

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
            examples: {
              sample: {
                summary: 'Register payload',
                value: {
                  email: 'user@mail.com',
                  password: 'password123',
                  displayName: 'Quang',
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
              schema: { $ref: '#/components/schemas/RegisterResponse' },
              examples: {
                sample: {
                  summary: 'Created user',
                  value: {
                    user: {
                      id: 'uuid',
                      email: 'user@mail.com',
                      displayName: 'Quang',
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '409': {
          description: 'Email exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              sample: {
                summary: 'Login payload',
                value: {
                  email: 'user@mail.com',
                  password: 'password123',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Tokens + user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' },
              examples: {
                sample: {
                  summary: 'Login response',
                  value: {
                    accessToken: 'jwt',
                    user: {
                      id: 'uuid',
                      email: 'user@mail.com',
                      displayName: 'Quang',
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh tokens (rotation)',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshRequest' },
            examples: {
              sample: {
                summary: 'Refresh payload',
                value: {
                  refreshToken: 'jwt',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'New access + refresh',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshResponse' },
              examples: {
                sample: {
                  summary: 'Refresh response',
                  value: {
                    accessToken: 'jwt',
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Refresh invalid/revoked/expired',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout (revoke refresh token)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshRequest' },
            examples: {
              sample: {
                summary: 'Logout payload',
                value: {
                  refreshToken: 'jwt',
                },
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
              schema: { $ref: '#/components/schemas/LogoutResponse' },
              examples: {
                sample: {
                  summary: 'Logout response',
                  value: { ok: true },
                },
              },
            },
          },
        },
      },
    },
  },

  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Forgot password (send reset email)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            examples: {
              sample: {
                summary: 'Forgot password payload',
                value: {
                  email: 'user@mail.com',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'OK (always ok=true to avoid leaking whether email exists)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordResponse' },
              examples: {
                sample: {
                  summary: 'OK',
                  value: { ok: true },
                },
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password using token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            examples: {
              sample: {
                summary: 'Reset password payload',
                value: {
                  token: 'token-from-email',
                  newPassword: 'newPassword123',
                },
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
              schema: { $ref: '#/components/schemas/ResetPasswordResponse' },
              examples: {
                sample: {
                  summary: 'OK',
                  value: { ok: true },
                },
              },
            },
          },
        },
        '400': {
          description: 'Invalid/expired token or validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user (from access token)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MeResponse' },
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
} as const;
