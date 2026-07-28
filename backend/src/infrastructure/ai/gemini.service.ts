import { aiService } from "./ai.service";

/**
 * Adapter tương thích ngược cho GeminiService.
 * Mọi yêu cầu gọi Gemini AI sẽ tự động điều hướng qua AiService linh hoạt.
 */
export class GeminiService {
  async generateSubtasks(title: string, description?: string | null): Promise<string[]> {
    return aiService.generateSubtasks(title, description);
  }
}

export const geminiService = new GeminiService();
