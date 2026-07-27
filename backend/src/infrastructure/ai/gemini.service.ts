import env from "../../config/env";
import { ApiError } from "../../common/errors/ApiError";

export class GeminiService {
  private getApiKey(): string {
    const key = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new ApiError(
        500,
        "AI_CONFIG_ERROR",
        "GEMINI_API_KEY chưa được cấu hình trong backend/.env. Vui lòng tạo key miễn phí tại https://aistudio.google.com"
      );
    }
    return key;
  }

  /**
   * Phân rã tiêu đề & mô tả của Card thành 3-5 sub-tasks nhỏ bằng Tiếng Việt
   */
  async generateSubtasks(title: string, description?: string | null): Promise<string[]> {
    const apiKey = this.getApiKey();

    const systemPrompt = `Bạn là một trợ lý AI quản lý dự án chuyên nghiệp. Nhiệm vụ của bạn là đọc tiêu đề và mô tả của một công việc, sau đó phân rã thành từ 3 đến 5 sub-tasks (công việc nhỏ) ngắn gọn, thực tế và có thể thực hiện được bằng Tiếng Việt.

BẮT BUỘC trả về KẾT QUẢ DUY NHẤT dạng một JSON Array chứa các chuỗi ký tự (JSON array of strings), KHÔNG bao gồm bất kỳ văn bản giải thích, ký tự markdown hay câu chào nào khác.

Ví dụ định dạng trả về:
["Thiết kế giao diện UI cho component", "Viết API Controller xử lý dữ liệu", "Viết Unit Test kiểm thử"]`;

    const userPrompt = `Tiêu đề công việc: "${title}"\nMô tả chi tiết: "${description || "Chưa có mô tả"}"`;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        // eslint-disable-next-line no-console
        console.error("[gemini-ai] API call failed:", response.status, errText);
        throw new ApiError(502, "AI_SERVICE_ERROR", `Lỗi gọi Gemini AI API (${response.status})`);
      }

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new ApiError(500, "AI_RESPONSE_INVALID", "Không nhận được phản hồi từ Gemini AI");
      }

      // Cleanup potential markdown formatting like ```json ... ```
      const cleaned = text.replace(/```json\s*|```\s*/gi, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new ApiError(500, "AI_RESPONSE_INVALID", "Kết quả trả về từ AI không đúng định dạng danh sách");
      }

      return parsed.map((item: any) => String(item).trim()).filter(Boolean);
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      // eslint-disable-next-line no-console
      console.error("[gemini-ai] Failed to generate subtasks:", err);
      throw new ApiError(500, "AI_GENERATION_FAILED", err?.message || "Không thể tự động phân rã công việc bằng AI");
    }
  }
}

export const geminiService = new GeminiService();
