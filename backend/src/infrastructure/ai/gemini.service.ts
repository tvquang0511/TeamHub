import env from "../../config/env";
import { ApiError } from "../../common/errors/ApiError";

export class GeminiService {
  private getApiKey(): string {
    const key = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "" || key.includes("YOUR_GEMINI_API_KEY")) {
      throw new ApiError(
        400,
        "AI_CONFIG_ERROR",
        "GEMINI_API_KEY chưa được cấu hình hoặc không hợp lệ. Vui lòng thêm GEMINI_API_KEY trên Render Environment Variables."
      );
    }
    return key.trim();
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

    const models = ["gemini-1.5-flash", "gemini-2.0-flash"];
    let lastErrorMsg = "";

    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          console.error(`[gemini-ai] Model ${model} failed:`, response.status, errText);

          let detail = errText;
          try {
            const parsed = JSON.parse(errText);
            detail = parsed.error?.message || errText;
          } catch {
            // Keep raw text
          }

          lastErrorMsg = detail;

          // If model not found (404), try next model in array
          if (response.status === 404) {
            continue;
          }

          // If 400 API key invalid or quota error, throw immediate readable ApiError
          throw new ApiError(
            400,
            "AI_SERVICE_ERROR",
            `Lỗi Google Gemini AI: ${detail}`
          );
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
        lastErrorMsg = err?.message || "Lỗi gọi API Gemini";
      }
    }

    throw new ApiError(
      400,
      "AI_GENERATION_FAILED",
      `Không thể tự động phân rã công việc bằng Gemini AI: ${lastErrorMsg}`
    );
  }
}

export const geminiService = new GeminiService();
