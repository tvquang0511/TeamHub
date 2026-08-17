import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chat.service';
import { chatRepo } from './chat.repo';
import { enqueueDeleteObject } from '../../integrations/queue/blobs.queue';
import { ApiError } from '../../common/errors/ApiError';

// Mock dependencies
vi.mock('./chat.repo', () => ({
  chatRepo: {
    findBoard: vi.fn(),
    isBoardMember: vi.fn(),
    findMessage: vi.fn(),
    listBoardMessages: vi.fn(),
    createMessageWithAttachments: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
    listMessageAttachments: vi.fn(),
    deleteMessageAttachments: vi.fn(),
  }
}));

vi.mock('../../integrations/queue/blobs.queue', () => ({
  enqueueDeleteObject: vi.fn(),
}));

describe('Chat Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should throw error if board not found', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue(null);

      await expect(
        chatService.createMessage('u1', 'b1', 'Hello')
      ).rejects.toThrow('Board not found');
    });

    it('should throw error if not board member', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(chatRepo.isBoardMember).mockResolvedValue(null);

      await expect(
        chatService.createMessage('u1', 'b1', 'Hello')
      ).rejects.toThrow('Chat is only available to board members');
    });

    it('should throw error if content is empty and no attachments', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(chatRepo.isBoardMember).mockResolvedValue({} as any);

      await expect(
        chatService.createMessage('u1', 'b1', '   ', [])
      ).rejects.toThrow('Message content is required');
    });

    it('should create message successfully', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(chatRepo.isBoardMember).mockResolvedValue({} as any);
      
      const mockCreated = {
        id: 'msg1',
        boardId: 'b1',
        senderId: 'u1',
        content: 'Hello',
        createdAt: new Date(),
        sender: { id: 'u1', displayName: 'User 1' },
        attachments: []
      };
      vi.mocked(chatRepo.createMessageWithAttachments).mockResolvedValue(mockCreated as any);

      const result = await chatService.createMessage('u1', 'b1', 'Hello');
      
      expect(chatRepo.createMessageWithAttachments).toHaveBeenCalledWith({
        boardId: 'b1',
        senderId: 'u1',
        content: 'Hello',
        attachmentIds: []
      });
      expect(result.message.id).toBe('msg1');
    });
  });

  describe('editMessage', () => {
    it('should throw error if window expired', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(chatRepo.isBoardMember).mockResolvedValue({} as any);
      
      vi.mocked(chatRepo.findMessage).mockResolvedValue({
        id: 'msg1',
        senderId: 'u1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
      } as any);

      await expect(
        chatService.editMessage('u1', 'b1', 'msg1', 'Hello again')
      ).rejects.toThrow('Message can only be edited within 20 minutes');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message and enqueue blob deletions', async () => {
      vi.mocked(chatRepo.findBoard).mockResolvedValue({ id: 'b1' } as any);
      vi.mocked(chatRepo.isBoardMember).mockResolvedValue({} as any);
      
      vi.mocked(chatRepo.findMessage).mockResolvedValue({
        id: 'msg1',
        senderId: 'u1',
        createdAt: new Date() // Just created
      } as any);
      
      vi.mocked(chatRepo.listMessageAttachments).mockResolvedValue([
        { bucket: 'test-bucket', objectKey: 'test-key' }
      ] as any);
      vi.mocked(chatRepo.deleteMessage).mockResolvedValue({} as any);
      vi.mocked(chatRepo.deleteMessageAttachments).mockResolvedValue({} as any);

      await expect(chatService.deleteMessage('u1', 'b1', 'msg1')).resolves.toEqual({ ok: true });

      expect(chatRepo.deleteMessage).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg1' }));
      expect(enqueueDeleteObject).toHaveBeenCalledWith({ bucket: 'test-bucket', objectKey: 'test-key' });
    });
  });
});
