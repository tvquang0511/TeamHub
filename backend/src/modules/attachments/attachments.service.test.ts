import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachmentsService } from './attachments.service';
import { attachmentsRepo } from './attachments.repo';
import { cardsRepo } from '../cards/cards.repo';
import { activitiesRepo } from '../activities/activities.repo';
import { ApiError } from '../../common/errors/ApiError';
import * as minioPresignPut from '../../common/minio/minio.presign.put';
import { enqueueDeleteObject } from '../../integrations/queue/blobs.queue';

// Mock dependencies
vi.mock('./attachments.repo', () => ({
  attachmentsRepo: {
    listByCard: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../cards/cards.repo', () => ({
  cardsRepo: {
    findById: vi.fn(),
    isWorkspaceMember: vi.fn(),
    isBoardMember: vi.fn(),
  }
}));

vi.mock('../activities/activities.repo', () => ({
  activitiesRepo: {
    createSafe: vi.fn(),
  }
}));

vi.mock('../../common/minio/minio.presign.put', () => ({
  presignPutObject: vi.fn().mockReturnValue({ url: 'http://presigned' }),
}));

vi.mock('../../integrations/queue/blobs.queue', () => ({
  enqueueDeleteObject: vi.fn(),
}));

describe('Attachments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('presignUpload', () => {
    it('should throw error if user cannot write card', async () => {
      vi.mocked(cardsRepo.findById).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(cardsRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        attachmentsService.presignUpload('u1', 'c1', { fileName: 'test.png', mimeType: 'image/png', size: 100 })
      ).rejects.toThrow('Board is read-only for non-members');
    });

    it('should return presigned URL', async () => {
      vi.mocked(cardsRepo.findById).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(cardsRepo.isBoardMember).mockResolvedValue({} as any);

      const result = await attachmentsService.presignUpload('u1', 'c1', { fileName: 'test.png', mimeType: 'image/png', size: 100 });

      expect(minioPresignPut.presignPutObject).toHaveBeenCalled();
      expect(result.presign.url).toBe('http://presigned');
    });
  });

  describe('delete', () => {
    it('should delete record and enqueue blob deletion', async () => {
      vi.mocked(attachmentsRepo.findById).mockResolvedValue({
        id: 'a1',
        cardId: 'c1',
        type: 'FILE',
        bucket: 'test-bucket',
        objectKey: 'test-key',
        card: { id: 'c1', list: { board: { id: 'b1', workspaceId: 'w1' } } }
      } as any);
      
      vi.mocked(cardsRepo.findById).mockResolvedValue({ 
        id: 'c1', 
        list: { board: { id: 'b1', workspaceId: 'w1' } } 
      } as any);
      vi.mocked(cardsRepo.isWorkspaceMember).mockResolvedValue({} as any);
      vi.mocked(cardsRepo.isBoardMember).mockResolvedValue({} as any);
      
      vi.mocked(attachmentsRepo.delete).mockResolvedValue({} as any);

      await expect(attachmentsService.delete('u1', 'a1')).resolves.toEqual({ ok: true });
      
      expect(attachmentsRepo.delete).toHaveBeenCalledWith('a1');
      expect(enqueueDeleteObject).toHaveBeenCalledWith({ bucket: 'test-bucket', objectKey: 'test-key' });
    });
  });
});
