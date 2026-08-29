import env from "../../config/env";
import { ApiError } from "../../common/errors/ApiError";
import { IAiProvider } from "./providers/ai-provider.interface";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { OpenRouterProvider } from "./providers/openrouter.provider";
import { DeepSeekProvider } from "./providers/deepseek.provider";
import { TogetherProvider } from "./providers/together.provider";

export class AiService {
  private providers: Map<string, IAiProvider> = new Map();

  constructor() {
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OpenAiProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new DeepSeekProvider());
    this.registerProvider(new TogetherProvider());
  }

  registerProvider(provider: IAiProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name: string): IAiProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Phân rã tiêu đề & mô tả của Card thành sub-tasks nhỏ với cơ chế linh hoạt & tự động chuyển Provider
   */
  async generateSubtasks(title: string, description?: string | null): Promise<string[]> {
    const selectedProviderName = (
      env.AI_PROVIDER ||
      process.env.AI_PROVIDER ||
      "auto"
    ).toLowerCase();

    const customModel = env.AI_MODEL || process.env.AI_MODEL;

    // Mode Explicit: Dùng duy nhất 1 Provider được chỉ định
    if (selectedProviderName !== "auto") {
      const provider = this.getProvider(selectedProviderName);
      if (!provider) {
        throw new ApiError(
          400,
          "AI_CONFIG_ERROR",
          `AI Provider '${selectedProviderName}' không được hỗ trợ. Vui lòng chọn một trong các provider: auto, gemini, groq, openai, openrouter.`
        );
      }

      if (!provider.isConfigured()) {
        throw new ApiError(
          400,
          "AI_CONFIG_ERROR",
          `Provider '${selectedProviderName}' chưa được cấu hình API Key. Vui lòng bổ sung ${selectedProviderName.toUpperCase()}_API_KEY trong Environment Variables.`
        );
      }

      return provider.generateSubtasks(title, description, customModel);
    }

    // Mode 'auto': Tự động thử các Provider đã cấu hình theo thứ tự ưu tiên (DeepSeek -> Gemini -> Groq -> Together -> OpenAI -> OpenRouter)
    const fallbackOrder = ["deepseek", "gemini", "groq", "together", "openai", "openrouter"];
    const configuredProviders: IAiProvider[] = [];

    for (const name of fallbackOrder) {
      const p = this.getProvider(name);
      if (p && p.isConfigured()) {
        configuredProviders.push(p);
      }
    }

    if (configuredProviders.length === 0) {
      throw new ApiError(
        400,
        "AI_CONFIG_ERROR",
        "Chưa có AI Provider nào được cấu hình API Key. Vui lòng thêm GEMINI_API_KEY hoặc GROQ_API_KEY trên Render Environment Variables."
      );
    }

    let lastErrorMsg = "";
    const fallbackErrors: Record<string, string> = {};

    for (const provider of configuredProviders) {
      try {
        return await provider.generateSubtasks(title, description, customModel);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn(`[AiService] Fallback trigger: Provider '${provider.name}' failed:`, err?.message || err);
        lastErrorMsg = err?.message || `Provider '${provider.name}' bị lỗi`;
        fallbackErrors[provider.name] = lastErrorMsg;
      }
    }

    const isQuotaError =
      lastErrorMsg.includes("Quota exceeded") ||
      lastErrorMsg.includes("RESOURCE_EXHAUSTED") ||
      lastErrorMsg.includes("limit: 0");

    if (isQuotaError) {
      throw new ApiError(
        400,
        "AI_QUOTA_EXCEEDED",
        "Tất cả các AI Provider khả dụng đều bị vượt hạn ngạch (Quota limit). Vui lòng thêm GROQ_API_KEY (từ https://console.groq.com) hoặc tạo API Key Gemini mới.",
        { fallbackErrors }
      );
    }

    throw new ApiError(
      400,
      "AI_GENERATION_FAILED",
      `Không thể phân rã công việc bằng AI. Tất cả provider đều thất bại.`,
      { fallbackErrors }
    );
  }
}

export const aiService = new AiService();
