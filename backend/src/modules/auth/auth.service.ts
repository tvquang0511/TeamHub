import bcrypt from "bcrypt";
import { authRepo } from "./auth.repo";

export const authService = {
  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }) {
    const existing = await authRepo.findUserByEmail(input.email);

    if (existing) {
      throw new Error("Email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await authRepo.createUser({
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
    });

    return user;
  },

  async login(email: string, password: string) {
    const user = await authRepo.findUserByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new Error("Invalid credentials");
    }

    return user;
  },
};