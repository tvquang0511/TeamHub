import { Request, Response } from "express";
import { authService } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schemas";

export const register = async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);

  const user = await authService.register(input);

  res.json(user);
};

export const login = async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);

  const user = await authService.login(input.email, input.password);

  res.json(user);
};