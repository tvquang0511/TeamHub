import prisma from '../../db/prisma';

export const authRepo = {
  findUserByEmail(email: string) {
    return prisma.users.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.users.findUnique({ where: { id } });
  },

  createUser(data: { email: string; passwordHash: string; displayName: string }) {
    return prisma.users.create({ data });
  },

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.refresh_tokens.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  },

  findValidRefreshToken(tokenHash: string) {
    return prisma.refresh_tokens.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  revokeRefreshToken(id: string) {
    return prisma.refresh_tokens.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refresh_tokens.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestedIp?: string | null;
    userAgent?: string | null;
  }) {
    // NOTE: If Prisma Client hasn't been regenerated yet, TS may not know this model.
    return prisma.password_reset_tokens.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        requestedIp: data.requestedIp ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  },

  markAllActivePasswordResetTokensUsed(userId: string) {
    return prisma.password_reset_tokens.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
  },

  findValidPasswordResetToken(tokenHash: string) {
    return prisma.password_reset_tokens.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  markPasswordResetTokenUsed(id: string) {
    return prisma.password_reset_tokens.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  updateUserPasswordHash(userId: string, passwordHash: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },
};
