import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activitiesService } from './activities.service';
import { activitiesRepo } from './activities.repo';

// Mock dependencies
vi.mock('./activities.repo', () => ({
  activitiesRepo: {
    listByBoard: vi.fn(),
    listByCard: vi.fn(),
    listByWorkspace: vi.fn(),
    pruneOldActivities: vi.fn(),
  }
}));

describe('Activities Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list by board', async () => {
    const mockActivities = [{ id: '1' }];
    vi.mocked(activitiesRepo.listByBoard).mockResolvedValue(mockActivities as any);

    const result = await activitiesService.listByBoard('b1');
    expect(activitiesRepo.listByBoard).toHaveBeenCalledWith('b1');
    expect(result.activities).toEqual(mockActivities);
  });

  it('should list by card', async () => {
    const mockActivities = [{ id: '1' }];
    vi.mocked(activitiesRepo.listByCard).mockResolvedValue(mockActivities as any);

    const result = await activitiesService.listByCard('c1');
    expect(activitiesRepo.listByCard).toHaveBeenCalledWith('c1');
    expect(result.activities).toEqual(mockActivities);
  });

  it('should prune old activities', async () => {
    vi.mocked(activitiesRepo.pruneOldActivities).mockResolvedValue({ count: 5 } as any);

    const result = await activitiesService.pruneOldActivities(30);
    expect(activitiesRepo.pruneOldActivities).toHaveBeenCalledWith(30);
    expect(result.deletedCount).toBe(5);
  });
});
