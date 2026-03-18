import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Shared schemas used across modules

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
});

export function toSchema(zodSchema: z.ZodTypeAny, name: string) {
  // zod-to-json-schema expects Zod v3-ish types; with Zod v4 we loosen the typing here.
  return zodToJsonSchema(zodSchema as any, { name });
}

export function buildSharedSchemas() {
  return {
    ErrorResponse: toSchema(ErrorSchema, 'ErrorResponse'),
    User: toSchema(UserSchema, 'User'),
  };
}
