import env from "../../config/env";
import { ApiError } from "../../common/errors/ApiError";

export class GeminiService {
  /**
   * Phân rã tiêu đề & mô tả của Card thành 3-5 sub-tasks nhỏ bằng Tiếng Việt
   */
  async generateSubtasks(title: string, description?: string | null): Promise<string[]> {
    const geminiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    const groqKey = (env.GROQ_API_KEY || process.env.GROQ_API_KEY || "").trim();

    if (!geminiKey && !groqKey) {
      throw new ApiError(
        400,
        "AI_CONFIG_ERROR",
        "Chưa cấu hình GEMINI_API_KEY hoặc GROQ_API_KEY trên Render Environment Variables."
      );
    }

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

    let lastErrorMsg = "";

    // 1. Try Gemini AI if key provided
    if (geminiKey && !geminiKey.includes("YOUR_GEMINI_API_KEY")) {
      const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

      for (const model of models) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
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

            if (isQuotaOrNotFound) {
              continue;
            }

            throw new ApiError(400, "AI_SERVICE_ERROR", `Lỗi Google Gemini AI: ${detail}`);
          }

          const data = (await response.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            const cleaned = text.replace(/```json\s*|```\s*/gi, "").trim();
            const parsed = JSON.parse(cleaned);

            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((item: any) => String(item).trim()).filter(Boolean);
            }
          }
        } catch (err: any) {
          if (err instanceof ApiError) throw err;
          lastErrorMsg = err?.message || "Lỗi gọi API Gemini";
        }
      }
    }

    // 2. Try Groq AI Fallback if Groq API Key is configured
    if (groqKey && !groqKey.includes("YOUR_GROQ_API_KEY")) {
      try {
        return await this.generateSubtasksWithGroq(groqKey, systemPrompt, userPrompt);
      } catch (err: any) {
        lastErrorMsg = err?.message || lastErrorMsg;
      }
    }

    // 3. Detailed error message with actionable solutions
    const isQuotaError = lastErrorMsg.includes("Quota exceeded") || lastErrorMsg.includes("RESOURCE_EXHAUSTED");

    if (isQuotaError) {
      throw new ApiError(
        400,
        "AI_QUOTA_EXCEEDED",
        "API Key Gemini hiện tại của bạn đã bị vượt hạn ngạch (Quota limit: 0). Bạn có thể: 1) Tạo 1 API Key MỚI tại https://aistudio.google.com/app/apikey (chọn 'Create API key in new project'), hoặc 2) Thêm GROQ_API_KEY (từ https://console.groq.com) vào Render để dùng miễn phí tốc độ cao."
      );
    }

    throw new ApiError(
      400,
      "AI_GENERATION_FAILED",
      `Không thể phân rã công việc bằng AI: ${lastErrorMsg}`
    );
  }

  private async generateSubtasksWithGroq(groqApiKey: string, systemPrompt: string, userPrompt: string): Promise<string[]> {
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    let groqError = "";

    for (const model of groqModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey.trim()}`,
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
          groqError = errText;
          continue;
        }

        const data = (await response.json()) as any;
        const text = data?.choices?.[0]?.message?.content;
        if (!text) continue;

        const cleaned = text.replace(/```json\s*|```\s*/gi, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => String(item).trim()).filter(Boolean);
        }
      } catch (err: any) {
        groqError = err?.message || "Lỗi Groq API";
      }
    }

    throw new ApiError(400, "AI_SERVICE_ERROR", `Lỗi gọi Groq AI API: ${groqError}`);
  }
}

export const geminiService = new GeminiService();
