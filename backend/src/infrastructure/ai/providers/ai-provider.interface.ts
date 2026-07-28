export interface IAiProvider {
  /**
   * Tên định danh của Provider (vd: 'gemini', 'groq', 'openai', 'openrouter')
   */
  readonly name: string;

  /**
   * Kiểm tra xem Provider đã được cấu hình đủ API key và điều kiện để sẵn sàng gọi chưa
   */
  isConfigured(): boolean;

  /**
   * Phân rã tiêu đề & mô tả của Card thành danh sách các sub-task
   */
  generateSubtasks(
    title: string,
    description?: string | null,
    customModel?: string
  ): Promise<string[]>;
}
