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

    const systemPrompt = `Bạn là Chuyên gia Quản lý Dự án & Tech Lead xuất sắc (Senior Technical Project Manager).
Nhiệm vụ của bạn là phân tích Tiêu đề và Mô tả của một công việc (task/card) và tự động phân rã thành từ 3 đến 5 công việc nhỏ (sub-tasks / checklist items) chính xác, rõ ràng và có thể hành động ngay được bằng Tiếng Việt.

NGUYÊN TẮC PHÂN RÃ CÔNG VIỆC:
1. Theo thứ tự quy trình thực tế: [Khởi tạo/Phân tích] -> [Thực thi/Lập trình/Thiết kế] -> [Kiểm thử/Review/Hoàn thiện].
2. Động từ hành động rõ ràng ở đầu mỗi task (Ví dụ: "Khởi tạo...", "Xây dựng...", "Cấu hình...", "Kiểm thử...", "Tối ưu...").
3. Tránh các từ chung chung vô nghĩa như "Đọc tài liệu", "Tìm hiểu", "Làm bài". Các sub-task phải cụ thể và sát với thực tế công việc.
4. Ngắn gọn, súc tích (mỗi sub-task từ 5 - 15 từ).

BẮT BUỘC trả về KẾT QUẢ DUY NHẤT dưới dạng JSON Array các chuỗi ký tự (JSON array of strings), KHÔNG kèm bất kỳ văn bản giải thích, ký tự markdown (như \`\`\`json) hay lời chào nào khác.

Ví dụ output chuẩn:
["Khởi tạo dữ liệu schema và migration", "Xây dựng RESTful API controller xử lý logic", "Tích hợp giao diện UI với API backend", "Viết Unit Test và kiểm thử luồng chạy"]`;

    const userPrompt = `Tiêu đề công việc: "${title}"\nMô tả chi tiết: "${description || "Chưa có mô tả chi tiết. Hãy dựa vào tiêu đề để phân rã các bước thực hiện chuẩn nhất."}"`;

    // Gemini models order (gemini-1.5-flash has the most stable Free Tier quota)
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
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

          const isQuotaOrNotFound =
            response.status === 404 ||
            response.status === 429 ||
            detail.includes("Quota exceeded") ||
            detail.includes("RESOURCE_EXHAUSTED") ||
            detail.includes("rate-limits");

          // If model not found or quota exceeded on this model, try next model in array
          if (isQuotaOrNotFound) {
            continue;
          }

          // If 400 API key invalid, throw immediate readable ApiError
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
