export const healthPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      responses: {
        '200': {
          description: 'OK',
        },
      },
    },
  },
} as const;
