import { buildSharedSchemas } from './components/schemas';
import { authPaths, buildAuthSchemas } from './paths/auth.paths';
import { healthPaths } from './paths/health.paths';
import { buildWorkspacesSchemas, workspacesPaths } from './paths/workspaces.paths';
import { buildInvitesSchemas, invitesPaths } from './paths/invites.paths';
import { buildBoardsSchemas, boardsPaths } from './paths/boards.paths';
import { buildListsSchemas, listsPaths } from './paths/lists.paths';
import { buildCardsSchemas, cardsPaths } from './paths/cards.paths';
import { usersPaths } from './paths/users.paths';
import { buildRemindersSchemas, remindersPaths } from './paths/reminders.paths';
import { buildAttachmentsSchemas, attachmentsPaths } from './paths/attachments.paths';
import { buildLabelsSchemas, labelsPaths } from './paths/labels.paths';
import { buildChecklistsSchemas, checklistsPaths } from './paths/checklists.paths';
import { buildAssigneesSchemas, assigneesPaths } from './paths/assignees.paths';
import { buildCommentsSchemas, commentsPaths } from './paths/comments.paths';
import { buildAnalyticsSchemas, analyticsPaths } from './paths/analytics.paths';

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
  const remindersSchemas = buildRemindersSchemas();
  const attachmentsSchemas = buildAttachmentsSchemas();
  const labelsSchemas = buildLabelsSchemas();
  const checklistsSchemas = buildChecklistsSchemas();
  const assigneesSchemas = buildAssigneesSchemas();
  const commentsSchemas = buildCommentsSchemas();
  const analyticsSchemas = buildAnalyticsSchemas();

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
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Workspaces' },
      { name: 'Invites' },
      { name: 'Users' },
      { name: 'Boards' },
      { name: 'Lists' },
      { name: 'Cards' },
      { name: 'Attachments' },
      { name: 'Labels' },
      { name: 'Checklists' },
      { name: 'Assignees' },
      { name: 'Comments' },
      { name: 'Analytics' },
      { name: 'Reminders' },
    ],
    components: {
      schemas: {
        ...sharedSchemas,
        ...authSchemas,
        ...workspacesSchemas,
        ...invitesSchemas,
        ...boardsSchemas,
        ...listsSchemas,
        ...cardsSchemas,
        ...attachmentsSchemas,
        ...labelsSchemas,
        ...checklistsSchemas,
        ...assigneesSchemas,
        ...commentsSchemas,
        ...analyticsSchemas,
        ...remindersSchemas,
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
      ...usersPaths,
      ...boardsPaths,
      ...listsPaths,
      ...cardsPaths,
      ...attachmentsPaths,
      ...labelsPaths,
      ...checklistsPaths,
      ...assigneesPaths,
      ...commentsPaths,
      ...analyticsPaths,
      ...remindersPaths,
    },
  };
}
