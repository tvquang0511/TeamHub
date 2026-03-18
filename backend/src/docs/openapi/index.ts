import { buildSharedSchemas } from './components/schemas';
import { authPaths, buildAuthSchemas } from './paths/auth.paths';
import { healthPaths } from './paths/health.paths';

/**
 * Modular OpenAPI entrypoint.
 * When you add a new module, create `src/docs/openapi/paths/<module>.paths.ts`
 * then spread its paths here and merge its schemas into components.schemas.
 */
export function buildOpenApiDocument() {
  const sharedSchemas = buildSharedSchemas();
  const authSchemas = buildAuthSchemas();

  return {
    openapi: '3.0.3',
    info: {
      title: 'TeamHub API',
      version: '0.1.0',
      description: 'Generated API docs (Swagger UI).',
    },
    servers: [
      {
        url: '/api',
        description: 'Backend API base (mounted under /api).',
      },
    ],
    tags: [{ name: 'Health' }, { name: 'Auth' }],
    components: {
      schemas: {
        ...sharedSchemas,
        ...authSchemas,
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      ...healthPaths,
      ...authPaths,
    },
  };
}
