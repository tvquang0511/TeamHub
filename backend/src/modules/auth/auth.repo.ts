import prisma from "../../db/prisma";

export const authRepo = {
  findUserByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email },
    });
  },

  createUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }) {
    return prisma.users.create({
      data,
    });
  },
};