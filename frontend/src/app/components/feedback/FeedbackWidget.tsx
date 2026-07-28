import React, { useState } from "react";
import { MessageSquareHeart, Send, Sparkles, X, Heart, ExternalLink, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

// High-visibility, super cute Feedback Widget linked to Google Form / Google Sheet
export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🤩");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Google Form / Sheet link (configurable via env variable or default fallback)
  const googleFormUrl =
    import.meta.env.VITE_FEEDBACK_GOOGLE_FORM_URL ||
    "https://docs.google.com/forms/d/e/1FAIpQLSd6do_gXneIDtTbfN5VTPsPfbvCc1RkD53FqWj92XG-SvK9-g/viewform?usp=header";

  const emojis = [
    { emoji: "🤩", label: "Thích mê" },
    { emoji: "💡", label: "Gợi ý hay" },
    { emoji: "🐛", label: "Báo lỗi" },
    { emoji: "💬", label: "Khác" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Trigger confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // If Google Form URL is provided, open with prefilled / direct link
    if (googleFormUrl) {
      const encodedText = encodeURIComponent(
        `[${selectedEmoji}] ${feedbackText.trim()}`
      );
      // Open Google Form in new tab
      window.open(
        googleFormUrl.includes("?")
          ? `${googleFormUrl}&entry.feedback=${encodedText}`
          : `${googleFormUrl}?feedback=${encodedText}`,
        "_blank"
      );
    }

    toast.success("🎉 Cảm ơn bạn rất nhiều! Ý kiến của bạn đã được ghi nhận 🥰", {
      description: "Đồ án TeamHub sẽ ngày càng hoàn thiện hơn nhờ góp ý của bạn!",
      duration: 5000,
    });

    setIsSubmitting(false);
    setFeedbackText("");
    setIsOpen(false);
  };

  return (
    <>
      {/* Confetti Animation Elements */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 80}%`,
                fontSize: `${16 + Math.random() * 20}px`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            >
              {["🎉", "✨", "💖", "🌟", "🥳", "💌"][i % 6]}
            </div>
          ))}
        </div>
      )}

      {/* Floating Widget Trigger Button (Góc phải bên dưới) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        {/* Pulsing Hint Badge */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/30 shadow-lg text-xs font-semibold text-foreground animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            <span>Góp ý đồ án nào! ✨</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-medium px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
          title="Gửi phản hồi / Góp ý đồ án ✨"
        >
          <div className="relative">
            <MessageSquareHeart className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
            <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="font-bold text-sm tracking-wide">Góp ý ✨</span>
        </button>
      </div>

      {/* Feedback Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-background rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header với Gradient hồng tím xinh xắn */}
            <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 p-6 text-white text-center overflow-hidden">
              {/* Background decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>

              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
                <Heart className="w-8 h-8 text-pink-200 fill-pink-200 animate-pulse" />
              </div>

              <h3 className="text-xl font-extrabold tracking-tight">
                Chia sẻ ý kiến cho TeamHub 💌
              </h3>
              <p className="text-xs text-pink-100 mt-1 font-medium">
                Ý kiến của bạn là động lực rất lớn giúp hoàn thiện đồ án! 🥰
              </p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Emoji Selector */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Bạn cảm thấy thế nào về ứng dụng?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {emojis.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedEmoji(item.emoji)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        selectedEmoji === item.emoji
                          ? "border-pink-500 bg-pink-500/10 shadow-sm scale-105"
                          : "border-border/60 hover:border-pink-300 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[11px] font-medium text-foreground mt-1">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea feedback */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nội dung đóng góp / Ý kiến của bạn:
                </label>
                <textarea
                  rows={3}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Nhập cảm nhận, lời nhắn hoặc ý tưởng mới của bạn tại đây nha..."
                  className="w-full rounded-2xl border border-input bg-muted/30 px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !feedbackText.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98 text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi Đóng Góp Ngay ✨</span>
                </button>

                {/* Direct Google Form Link Button */}
                <a
                  href={googleFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors font-medium"
                >
                  <span>Mở Google Form / Form đóng góp chi tiết</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </form>

            {/* Cute Footer */}
            <div className="bg-muted/40 px-6 py-3 border-t border-border/40 text-center">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <ThumbsUp className="w-3 h-3 text-pink-500" />
                Cảm ơn bạn đã trải nghiệm và hỗ trợ dự án TeamHub!
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
