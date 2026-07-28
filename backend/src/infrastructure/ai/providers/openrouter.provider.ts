import env from "../../../config/env";
import { ApiError } from "../../../common/errors/ApiError";
import { IAiProvider } from "./ai-provider.interface";

export class OpenRouterProvider implements IAiProvider {
  readonly name = "openrouter";

  private getApiKey(): string {
    const key = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
    return key.trim();
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return key !== "" && !key.includes("YOUR_OPENROUTER_API_KEY");
  }

  async generateSubtasks(
    title: string,
    description?: string | null,
    customModel?: string
  ): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new ApiError(400, "AI_CONFIG_ERROR", "OPENROUTER_API_KEY chưa được cấu hình hoặc không hợp lệ");
    }

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

    const models = customModel
      ? [customModel]
      : [
          "meta-llama/llama-3.3-70b-instruct:free",
          "google/gemini-2.0-flash-lite-001",
          "openai/gpt-4o-mini",
        ];
    let lastErrorMsg = "";

    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": env.APP_WEB_URL || "http://localhost:5173",
            "X-Title": "TeamHub AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          // eslint-disable-next-line no-console
          console.error(`[OpenRouterProvider] Model ${model} failed:`, response.status, errText);
          lastErrorMsg = errText;
          continue;
        }

        const data = (await response.json()) as any;
        const text = data?.choices?.[0]?.message?.content;

        if (text) {
          const cleaned = text.replace(/```json\s*|```\s*/gi, "").trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => String(item).trim()).filter(Boolean);
          }
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || "Lỗi khi gọi API OpenRouter";
      }
    }

    throw new ApiError(
      400,
      "AI_SERVICE_ERROR",
      `OpenRouter Provider thất bại: ${lastErrorMsg}`
    );
  }
}
