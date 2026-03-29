import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { chatService } from "../modules/chat/chat.service";

type SocketAuthUser = { id: string; email?: string };

declare module "socket.io" {
  interface SocketData {
    user?: SocketAuthUser;
  }
}

function parseCorsOrigins(): string[] {
  return (
    process.env.CORS_ORIGIN
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? ["http://localhost:5173"]
  );
}

function extractBearerToken(value?: string | string[]) {
  if (!value) return null;
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const tokenFromAuth =
      typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : null;

    const tokenFromHeader = extractBearerToken(socket.handshake.headers.authorization);

    const token = tokenFromAuth || tokenFromHeader;
    if (!token) return next(new Error("AUTH_TOKEN_INVALID"));

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email?: string };
      socket.data.user = { id: payload.sub, email: payload.email };
      return next();
    } catch (e: any) {
      if (e?.name === "TokenExpiredError") return next(new Error("AUTH_TOKEN_EXPIRED"));
      return next(new Error("AUTH_TOKEN_INVALID"));
    }
  });

  const roomName = (boardId: string) => `board:${boardId}`;

  io.on("connection", (socket) => {
    const userId = socket.data.user!.id;

    socket.on("board:join", async (payload: { boardId: string }, ack?: (res: any) => void) => {
      try {
        const boardId = String(payload?.boardId ?? "");
        if (!boardId) throw new Error("BOARD_ID_REQUIRED");

        // Strictly board members only. Service will enforce.
        await chatService.listBoardMessages(userId, boardId, { limit: 1 });

        await socket.join(roomName(boardId));
        ack?.({ ok: true });
      } catch (err: any) {
        ack?.({ ok: false, error: normalizeSocketError(err) });
      }
    });

    socket.on(
      "chat:message:send",
      async (payload: { boardId: string; content: string }, ack?: (res: any) => void) => {
        try {
          const boardId = String(payload?.boardId ?? "");
          const content = String(payload?.content ?? "");
          const result = await chatService.createMessage(userId, boardId, content);

          io.to(roomName(boardId)).emit("chat:message:new", result);
          ack?.({ ...result, ok: true });
        } catch (err: any) {
          ack?.({ ok: false, error: normalizeSocketError(err) });
        }
      },
    );

    socket.on(
      "chat:message:edit",
      async (
        payload: { boardId: string; messageId: string; content: string },
        ack?: (res: any) => void,
      ) => {
        try {
          const boardId = String(payload?.boardId ?? "");
          const messageId = String(payload?.messageId ?? "");
          const content = String(payload?.content ?? "");
          const result = await chatService.editMessage(userId, boardId, messageId, content);

          io.to(roomName(boardId)).emit("chat:message:updated", result);
          ack?.({ ...result, ok: true });
        } catch (err: any) {
          ack?.({ ok: false, error: normalizeSocketError(err) });
        }
      },
    );

    socket.on(
      "chat:message:delete",
      async (payload: { boardId: string; messageId: string }, ack?: (res: any) => void) => {
        try {
          const boardId = String(payload?.boardId ?? "");
          const messageId = String(payload?.messageId ?? "");
          const result = await chatService.deleteMessage(userId, boardId, messageId);

          io.to(roomName(boardId)).emit("chat:message:deleted", { boardId, messageId });
          ack?.({ ...result, ok: true });
        } catch (err: any) {
          ack?.({ ok: false, error: normalizeSocketError(err) });
        }
      },
    );
  });

  if (process.env.NODE_ENV !== "production") {
    // Loaded lazily so prod can omit dependency if desired.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { instrument } = require("@socket.io/admin-ui") as typeof import("@socket.io/admin-ui");

    instrument(io, {
      auth: false,
      mode: "development",
    });
  }

  return io;
}

function normalizeSocketError(err: any) {
  // Prefer ApiError (same shape as REST error handler)
  if (err && typeof err === "object") {
    if (typeof err.status === "number" && typeof err.code === "string") {
      return { code: err.code, message: err.message };
    }

    if (err?.error?.code && err?.error?.message) {
      return { code: err.error.code, message: err.error.message };
    }
  }

  // Fallback
  const message = typeof err?.message === "string" ? err.message : "Unknown error";
  return { code: "SOCKET_ERROR", message };
}
