import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from './analytics.service';
import { boardsRepo } from '../boards/boards.repo';
import { workspacesRepo } from '../workspaces/workspaces.repo';
import prisma from '../../db/prisma';
import * as redisCache from '../../integrations/cache/redisCache';
import { ApiError } from '../../common/errors/ApiError';

// Mock dependencies
vi.mock('../boards/boards.repo', () => ({
  boardsRepo: {
    findById: vi.fn(),
    isBoardMember: vi.fn(),
  }
}));

vi.mock('../workspaces/workspaces.repo', () => ({
  workspacesRepo: {
    findMembership: vi.fn(),
  }
}));

vi.mock('../../db/prisma', () => ({
  default: {
    board_metrics_daily: {
      findMany: vi.fn(),
    },
    workspaces: {
      findUnique: vi.fn(),
    }
  }
}));

vi.mock('../../integrations/cache/redisCache', () => ({
  cacheGetJson: vi.fn(),
  cacheSetJson: vi.fn(),
  cacheKey: vi.fn().mockReturnValue('mock-key'),
  getAnalyticsCacheVersion: vi.fn().mockResolvedValue(1),
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBoardAnalytics', () => {
    it('should throw error if board not found', async () => {
      vi.mocked(boardsRepo.findById).mockResolvedValue(null);

      await expect(
        analyticsService.getBoardAnalytics('u1', 'b1', {})
      ).rejects.toThrow('Board not found');
    });

    it('should throw error if user is not OWNER or ADMIN', async () => {
      vi.mocked(boardsRepo.findById).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({ role: 'MEMBER' } as any);

      await expect(
        analyticsService.getBoardAnalytics('u1', 'b1', {})
      ).rejects.toThrow('Only board OWNER/ADMIN can access analytics');
    });

    it('should return cached analytics if available', async () => {
      vi.mocked(boardsRepo.findById).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({ role: 'ADMIN' } as any);
      
      const mockCached = { range: { from: '2023-01-01', to: '2023-01-31' }, daily: [], summary: {} };
      vi.mocked(redisCache.cacheGetJson).mockResolvedValue(mockCached as any);

      const result = await analyticsService.getBoardAnalytics('u1', 'b1', {});

      expect(redisCache.cacheGetJson).toHaveBeenCalled();
      expect(result).toEqual(mockCached);
      expect(prisma.board_metrics_daily.findMany).not.toHaveBeenCalled();
    });

    it('should compute analytics and cache if not in cache', async () => {
      vi.mocked(boardsRepo.findById).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(boardsRepo.isBoardMember).mockResolvedValue({ role: 'ADMIN' } as any);
      vi.mocked(redisCache.cacheGetJson).mockResolvedValue(null);

      const mockDaily = [
        {
          date: new Date('2023-01-01'),
          cardsCreatedCount: 5,
          cardsDoneCount: 2,
          cardsMovedCount: 1,
          commentsCount: 3,
          attachmentsCount: 1,
          assigneesAddedCount: 0,
          assigneesRemovedCount: 0,
          avgCycleTimeSec: 3600,
          avgLeadTimeSec: 7200,
          wipCount: 3,
          overdueCount: 0
        }
      ];
      vi.mocked(prisma.board_metrics_daily.findMany).mockResolvedValue(mockDaily as any);

      const result = await analyticsService.getBoardAnalytics('u1', 'b1', { from: '2023-01-01', to: '2023-01-31' });

      expect(prisma.board_metrics_daily.findMany).toHaveBeenCalled();
      expect(redisCache.cacheSetJson).toHaveBeenCalled();
      expect(result.summary.cardsCreatedCount).toBe(5);
    });
  });

  describe('getWorkspaceAnalytics', () => {
    it('should calculate workspace analytics correctly', async () => {
      vi.mocked(workspacesRepo.findMembership).mockResolvedValue({ role: 'OWNER' } as any);

      const mockWorkspace = {
        id: 'w1', name: 'WS',
        members: [{ userId: 'u1', user: { id: 'u1', displayName: 'User 1' } }],
        boards: [
          {
            id: 'b1', name: 'Board 1',
            lists: [
              {
                cards: [
                  { 
                    id: 'c1', isDone: true, dueAt: new Date(Date.now() - 100000), 
                    estimatedHours: 2, loggedSeconds: 3600,
                    assignees: [{ userId: 'u1', user: { id: 'u1', displayName: 'User 1' } }]
                  },
                  { 
                    id: 'c2', isDone: false, dueAt: new Date(Date.now() - 100000), // overdue
                    estimatedHours: 3, loggedSeconds: 7200,
                    assignees: []
                  }
                ]
              }
            ]
          }
        ]
      };
      vi.mocked(prisma.workspaces.findUnique).mockResolvedValue(mockWorkspace as any);

      const result = await analyticsService.getWorkspaceAnalytics('u1', 'w1');

      expect(result.kpis.totalCards).toBe(2);
      expect(result.kpis.completedCards).toBe(1);
      expect(result.kpis.overdueCards).toBe(1);
      expect(result.kpis.totalEstimatedHours).toBe(5);
      expect(result.kpis.totalLoggedHours).toBe(3); // (3600+7200)/3600

      expect(result.boardStats[0].completionRate).toBe(50);
      
      expect(result.memberStats[0].assignedCards).toBe(1);
      expect(result.memberStats[0].completedCards).toBe(1);
      expect(result.memberStats[0].loggedHours).toBe(1); // 3600/3600
    });
  });
});
