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
  const origins = (
    env.CORS_ORIGIN
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? ["http://localhost:5173"]
  ).slice();

  if (env.SOCKET_ADMIN_UI_ENABLED && env.NODE_ENV !== "production") {
    const adminOrigin = env.SOCKET_ADMIN_UI_ORIGIN || "https://admin.socket.io";
    if (adminOrigin && !origins.includes(adminOrigin)) origins.push(adminOrigin);
  }

  return origins;
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
    // Admin UI uses its own auth middleware on the /admin namespace.
    // Do not require app JWT there.
    if (env.SOCKET_ADMIN_UI_ENABLED && socket.nsp.name === "/admin") {
      return next();
    }

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
      async (
        payload: { boardId: string; content: string; attachmentIds?: string[] },
        ack?: (res: any) => void,
      ) => {
        try {
          const boardId = String(payload?.boardId ?? "");
          const content = String(payload?.content ?? "");
          const attachmentIds = Array.isArray(payload?.attachmentIds) ? payload.attachmentIds : undefined;
          const result = await chatService.createMessage(userId, boardId, content, attachmentIds);

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

  if (env.SOCKET_ADMIN_UI_ENABLED && env.NODE_ENV !== "production") {
    // Loaded lazily so prod can omit dependency if desired.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { instrument } = require("@socket.io/admin-ui") as typeof import("@socket.io/admin-ui");

    // @socket.io/admin-ui expects a bcrypt hash.
    // Allow a plain password in env for developer convenience.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require("bcryptjs") as typeof import("bcryptjs");

    let passwordHash = env.SOCKET_ADMIN_UI_PASSWORD;
    try {
      bcrypt.getRounds(passwordHash);
    } catch {
      passwordHash = bcrypt.hashSync(passwordHash, 10);
    }

    instrument(io, {
      auth: {
        type: "basic",
        username: env.SOCKET_ADMIN_UI_USERNAME,
        password: passwordHash,
      },
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
