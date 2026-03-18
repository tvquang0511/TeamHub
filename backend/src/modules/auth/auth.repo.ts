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
};
