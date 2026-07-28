import React, { useState, useEffect } from "react";
import { MessageSquareHeart, Sparkles, X, Heart, ExternalLink, ThumbsUp, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../providers/AuthProvider";

// High-visibility, super cute Feedback Widget linked to Google Form / Google Sheet
export const FeedbackWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🤩");
  const [feedbackText, setFeedbackText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "embedded">("quick");

  // Tự động điền thông tin người dùng nếu đã đăng nhập
  useEffect(() => {
    if (user) {
      if (user.displayName) setSenderName(user.displayName);
      if (user.email) setSenderContact(user.email);
    }
  }, [user]);

  // Google Form / Sheet link
  const rawFormUrl =
    import.meta.env.VITE_FEEDBACK_GOOGLE_FORM_URL ||
    "https://docs.google.com/forms/d/e/1FAIpQLSd6do_gXneIDtTbfN5VTPsPfbvCc1RkD53FqWj92XG-SvK9-g/viewform?usp=header";

  const embeddedFormUrl = rawFormUrl.includes("embedded=true")
    ? rawFormUrl
    : rawFormUrl.includes("?")
    ? `${rawFormUrl}&embedded=true`
    : `${rawFormUrl}?embedded=true`;

  const emojis = [
    { emoji: "🤩", label: "Thích mê" },
    { emoji: "💡", label: "Gợi ý hay" },
    { emoji: "🐛", label: "Báo lỗi" },
    { emoji: "💬", label: "Khác" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Trigger confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    const userInfoString = [
      senderName.trim() ? `Người gửi: ${senderName.trim()}` : "",
      senderContact.trim() ? `Liên hệ: ${senderContact.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" - ");

    const fullFeedbackText = userInfoString
      ? `[${selectedEmoji}] ${feedbackText.trim()} (${userInfoString})`
      : `[${selectedEmoji}] ${feedbackText.trim()}`;

    // Mở trang Google Form để gửi chính xác 100% vào Google Sheet
    window.open(rawFormUrl, "_blank");
    // eslint-disable-next-line no-console
    console.log("[Feedback]", fullFeedbackText);

    toast.success("🎉 Cảm ơn bạn rất nhiều! Đã mở Google Form để hoàn tất gửi 🥰", {
      description: "Nội dung phản hồi của bạn giúp đồ án TeamHub ngày càng hoàn thiện!",
      duration: 5000,
    });

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

      {/* Floating Widget Trigger Button (Góc trái bên dưới) */}
      <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2">
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

        {/* Pulsing Hint Badge (Nằm ở bên phải của nút bấm) */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/30 shadow-lg text-xs font-semibold text-foreground animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            <span>Góp ý đồ án nào! ✨</span>
          </div>
        )}
      </div>

      {/* Feedback Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-background rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header với Gradient hồng tím xinh xắn */}
            <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 p-5 text-white text-center overflow-hidden shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex p-2.5 bg-white/20 backdrop-blur-md rounded-2xl mb-2 shadow-inner">
                <Heart className="w-6 h-6 text-pink-200 fill-pink-200 animate-pulse" />
              </div>

              <h3 className="text-lg font-extrabold tracking-tight">
                Chia sẻ ý kiến cho TeamHub 💌
              </h3>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center justify-center gap-2 mt-3 bg-white/15 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("quick")}
                  className={`flex-1 py-1 px-3 rounded-lg font-bold transition-all ${
                    activeTab === "quick"
                      ? "bg-white text-pink-600 shadow-sm"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  📝 Gửi nhanh
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("embedded")}
                  className={`flex-1 py-1 px-3 rounded-lg font-bold transition-all ${
                    activeTab === "embedded"
                      ? "bg-white text-pink-600 shadow-sm"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  📋 Form trực tiếp
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {activeTab === "embedded" ? (
              <div className="flex-1 overflow-auto p-1 bg-muted/20 min-h-[420px]">
                <iframe
                  src={embeddedFormUrl}
                  title="Google Form Feedback"
                  className="w-full h-full min-h-[420px] rounded-b-2xl border-0"
                >
                  Đang tải Google Form...
                </iframe>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-auto">
                {/* User Name & Contact Input Fields */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Tên của bạn
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="VD: Tuấn Anh..."
                      className="w-full rounded-xl border border-input bg-muted/30 px-3 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Email / SĐT
                    </label>
                    <input
                      type="text"
                      value={senderContact}
                      onChange={(e) => setSenderContact(e.target.value)}
                      placeholder="VD: email@gmail.com"
                      className="w-full rounded-xl border border-input bg-muted/30 px-3 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-pink-500 outline-none"
                    />
                  </div>
                </div>

                {/* Emoji Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Cảm nhận của bạn về ứng dụng:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {emojis.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setSelectedEmoji(item.emoji)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                          selectedEmoji === item.emoji
                            ? "border-pink-500 bg-pink-500/10 shadow-sm scale-105"
                            : "border-border/60 hover:border-pink-300 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <span className="text-[10px] font-medium text-foreground mt-1">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea feedback */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Ý kiến / Đóng góp chi tiết:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Nhập cảm nhận hoặc lời nhắn của bạn tại đây..."
                    className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-pink-500 outline-none resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!feedbackText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Mở Google Form Gửi Ngay ✨</span>
                  </button>

                  <a
                    href={rawFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 font-medium"
                  >
                    <span>Mở trang Google Form riêng trong tab mới</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </form>
            )}

            {/* Cute Footer */}
            <div className="bg-muted/40 px-6 py-2 border-t border-border/40 text-center shrink-0">
              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <ThumbsUp className="w-3 h-3 text-pink-500" />
                Cảm ơn bạn đã hỗ trợ dự án TeamHub!
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
