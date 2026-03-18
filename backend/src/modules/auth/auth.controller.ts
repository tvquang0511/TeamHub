import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const register = async (req: Request, res: Response) => {
  const input = registerBodySchema.parse(req.body);
  const result = await authService.register(input);
  return res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const input = loginBodySchema.parse(req.body);
  const result = await authService.login(input);
  return res.json(result);
};

export const refresh = async (req: Request, res: Response) => {
  const input = refreshBodySchema.parse(req.body);
  const result = await authService.refresh(input);
  return res.json(result);
};

export const logout = async (req: Request, res: Response) => {
  const input = refreshBodySchema.parse(req.body);
  const result = await authService.logout(input);
  return res.json(result);
};
