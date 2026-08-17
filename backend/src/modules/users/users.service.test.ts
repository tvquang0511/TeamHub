import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './users.service';
import { usersRepo } from './users.repo';
import { ApiError } from '../../common/errors/ApiError';
import * as storage from '../../infrastructure/storage';

// Mock dependencies
vi.mock('./users.repo', () => ({
  usersRepo: {
    getById: vi.fn(),
    updateProfile: vi.fn(),
    searchByEmailPrefix: vi.fn(),
  }
}));

vi.mock('../../infrastructure/storage', () => ({
  presignPutObject: vi.fn(),
  buildPublicStorageUrl: vi.fn().mockReturnValue('http://storage/avatar'),
}));

vi.mock('../../integrations/queue/blobs.queue', () => ({
  enqueueDeleteObject: vi.fn(),
}));

describe('Users Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateMe', () => {
    it('should update display name and description', async () => {
      vi.mocked(usersRepo.updateProfile).mockResolvedValue({
        id: 'u1',
        displayName: 'New Name',
        description: 'New Desc'
      } as any);

      const result = await usersService.updateMe('u1', {
        displayName: 'New Name',
        description: 'New Desc'
      });

      expect(usersRepo.updateProfile).toHaveBeenCalledWith('u1', {
        displayName: 'New Name',
        description: 'New Desc'
      });
      expect(result.user.displayName).toBe('New Name');
    });
  });

  describe('initAvatarUpload', () => {
    it('should throw error for invalid content type', async () => {
      await expect(
        usersService.initAvatarUpload('u1', { fileName: 'test.pdf', contentType: 'application/pdf' })
      ).rejects.toThrow('Unsupported avatar content type');
    });

    it('should return presigned upload url', async () => {
      vi.mocked(storage.presignPutObject).mockReturnValue({
        url: 'http://presigned',
        method: 'PUT',
        headers: {}
      } as any);

      const result = await usersService.initAvatarUpload('u1', { fileName: 'test.png', contentType: 'image/png' });

      expect(storage.presignPutObject).toHaveBeenCalledWith(expect.objectContaining({
        objectKey: 'avatars/u1',
        contentType: 'image/png'
      }));
      expect(result.upload.url).toBe('http://presigned');
    });
  });
});
