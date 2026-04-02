import { Request, Response } from "express";

import { chatService, listBoardMessagesInputSchema } from "./chat.service";

export class ChatController {
  listBoardMessages = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const input = listBoardMessagesInputSchema.parse(req.query);
    const result = await chatService.listBoardMessages(userId, boardId, input);
    res.status(200).json(result);
  };
}

export const chatController = new ChatController();
