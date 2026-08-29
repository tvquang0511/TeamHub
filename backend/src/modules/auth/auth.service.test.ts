import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { authService } from './auth.service';
import { authRepo } from './auth.repo';
import { ApiError } from '../../common/errors/ApiError';
import { enqueuePasswordResetEmailJob } from '../../infrastructure/queue/emails.queue';

// Mock dependencies
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  }
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn(),
}));

vi.mock('./auth.repo', () => ({
  authRepo: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    createRefreshToken: vi.fn(),
    findValidRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    markAllActivePasswordResetTokensUsed: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findValidPasswordResetToken: vi.fn(),
    updateUserPasswordHash: vi.fn(),
    markPasswordResetTokenUsed: vi.fn(),
    revokeAllRefreshTokensForUser: vi.fn(),
    createEmailVerificationToken: vi.fn(),
    findValidEmailVerificationToken: vi.fn(),
    markEmailVerificationTokenUsed: vi.fn(),
    verifyUserEmail: vi.fn(),
  }
}));

vi.mock('../../infrastructure/queue/emails.queue', () => ({
  enqueuePasswordResetEmailJob: vi.fn(),
  enqueueEmailVerificationJob: vi.fn(),
}));

vi.mock('../../infrastructure/mail/mailer', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
  sendEmailVerificationEmail: vi.fn().mockResolvedValue({}),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should throw error if email already exists', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({} as any);

      await expect(authService.register({ email: 'test@test.com', password: '123', displayName: 'Test' }))
        .rejects.toThrow(ApiError);
    });

    it('should register a new user successfully', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_pw' as never);
      vi.mocked(authRepo.createUser).mockResolvedValue({ id: 'u1', email: 'test@test.com', displayName: 'Test' } as any);
      vi.mocked(authRepo.createEmailVerificationToken).mockResolvedValue({} as any);

      const result = await authService.register({ email: 'test@test.com', password: '123', displayName: 'Test' });

      expect(bcrypt.hash).toHaveBeenCalledWith('123', expect.any(Number));
      expect(authRepo.createUser).toHaveBeenCalledWith({
        email: 'test@test.com',
        passwordHash: 'hashed_pw',
        displayName: 'Test'
      });
      expect(authRepo.createEmailVerificationToken).toHaveBeenCalled();
      expect(result.user.id).toBe('u1');
    });
  });

  describe('login', () => {
    it('should throw error if user not found', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);

      await expect(authService.login({ email: 'x@x.com', password: '123' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error if email is not verified', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ id: 'u1', email: 'x@x.com', passwordHash: 'hash', emailVerifiedAt: null } as any);

      await expect(authService.login({ email: 'x@x.com', password: '123' }))
        .rejects.toThrow('Please verify your email before logging in');
    });

    it('should throw error if password does not match', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ passwordHash: 'hash', emailVerifiedAt: new Date() } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login({ email: 'x@x.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should login successfully', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ id: 'u1', email: 'x@x.com', displayName: 'X', passwordHash: 'hash', emailVerifiedAt: new Date() } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue('mock_token' as any);
      vi.mocked(jwt.decode).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 } as any);
      vi.mocked(authRepo.createRefreshToken).mockResolvedValue({} as any);

      const result = await authService.login({ email: 'x@x.com', password: '123' });

      expect(result.accessToken).toBe('mock_token');
      expect(result.user.id).toBe('u1');
    });
  });

  describe('forgotPassword', () => {
    it('should not throw error if user not found (security: no email leak)', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);

      const result = await authService.forgotPassword({ email: 'unknown@test.com' });
      expect(result.ok).toBe(true);
      expect(enqueuePasswordResetEmailJob).not.toHaveBeenCalled();
    });

    it('should enqueue email job if user is found', async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ id: 'u1', email: 'x@x.com' } as any);
      
      await authService.forgotPassword({ email: 'x@x.com' });

      expect(authRepo.markAllActivePasswordResetTokensUsed).toHaveBeenCalledWith('u1');
      expect(authRepo.createPasswordResetToken).toHaveBeenCalled();
    });
  });
});
