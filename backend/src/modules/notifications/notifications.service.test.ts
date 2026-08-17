import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from './notifications.service';
import { notificationsRepo } from './notifications.repo';
import * as socketModule from '../../realtime/socket';

// Mock dependencies
vi.mock('./notifications.repo', () => ({
  notificationsRepo: {
    listByUser: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  }
}));

vi.mock('../../realtime/socket', () => ({
  getSocketServer: vi.fn(),
}));

describe('Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAndPushNotification', () => {
    it('should create notification and emit via socket', async () => {
      const mockNotification = { id: 'n1', userId: 'u1', content: 'Test' };
      vi.mocked(notificationsRepo.create).mockResolvedValue(mockNotification as any);
      
      const mockEmit = vi.fn();
      const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
      vi.mocked(socketModule.getSocketServer).mockReturnValue({ to: mockTo } as any);

      const result = await notificationsService.createAndPushNotification({
        userId: 'u1',
        title: 'Title',
        content: 'Test',
        type: 'CARD_ASSIGNED'
      });

      expect(notificationsRepo.create).toHaveBeenCalled();
      expect(mockTo).toHaveBeenCalledWith('user:u1');
      expect(mockEmit).toHaveBeenCalledWith('notification:new', mockNotification);
      expect(result).toEqual(mockNotification);
    });

    it('should silently handle socket failure', async () => {
      const mockNotification = { id: 'n1', userId: 'u1', content: 'Test' };
      vi.mocked(notificationsRepo.create).mockResolvedValue(mockNotification as any);
      
      // Simulate socket not initialized
      vi.mocked(socketModule.getSocketServer).mockReturnValue(null as any);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notificationsService.createAndPushNotification({
        userId: 'u1',
        title: 'Title',
        content: 'Test',
        type: 'CARD_ASSIGNED'
      });

      expect(result).toEqual(mockNotification);
      consoleSpy.mockRestore();
    });
  });

  it('should mark all as read', async () => {
    vi.mocked(notificationsRepo.markAllAsRead).mockResolvedValue({} as any);
    await notificationsService.markAllAsRead('u1');
    expect(notificationsRepo.markAllAsRead).toHaveBeenCalledWith('u1');
  });
});
