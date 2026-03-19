import { buildSharedSchemas } from './components/schemas';
import { authPaths, buildAuthSchemas } from './paths/auth.paths';
import { healthPaths } from './paths/health.paths';
import { buildWorkspacesSchemas, workspacesPaths } from './paths/workspaces.paths';
import { buildInvitesSchemas, invitesPaths } from './paths/invites.paths';
import { buildBoardsSchemas, boardsPaths } from './paths/boards.paths';
import { buildListsSchemas, listsPaths } from './paths/lists.paths';
import { buildCardsSchemas, cardsPaths } from './paths/cards.paths';

/**
 * Modular OpenAPI entrypoint.
 * When you add a new module, create `src/docs/openapi/paths/<module>.paths.ts`
 * then spread its paths here and merge its schemas into components.schemas.
 */
export function buildOpenApiDocument() {
  const sharedSchemas = buildSharedSchemas();
  const authSchemas = buildAuthSchemas();
  const workspacesSchemas = buildWorkspacesSchemas();
  const invitesSchemas = buildInvitesSchemas();
  const boardsSchemas = buildBoardsSchemas();
  const listsSchemas = buildListsSchemas();
  const cardsSchemas = buildCardsSchemas();

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
  tags: [{ name: 'Health' }, { name: 'Auth' }, { name: 'Workspaces' }, { name: 'Invites' }, { name: 'Boards' }, { name: 'Lists' }, { name: 'Cards' }],
    components: {
      schemas: {
        ...sharedSchemas,
        ...authSchemas,
        ...workspacesSchemas,
        ...invitesSchemas,
        ...boardsSchemas,
        ...listsSchemas,
        ...cardsSchemas,
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
      ...workspacesPaths,
      ...invitesPaths,
      ...boardsPaths,
      ...listsPaths,
      ...cardsPaths,
    },
  };
}
