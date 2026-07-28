import React, { useState } from "react";
import { MessageSquareHeart, Sparkles, X, Heart, ExternalLink, ThumbsUp, Loader2 } from "lucide-react";

// High-visibility, super cute Embedded Google Form Feedback Widget
export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);

  // Google Form / Sheet link
  const rawFormUrl =
    import.meta.env.VITE_FEEDBACK_GOOGLE_FORM_URL ||
    "https://docs.google.com/forms/d/e/1FAIpQLSd6do_gXneIDtTbfN5VTPsPfbvCc1RkD53FqWj92XG-SvK9-g/viewform?usp=header";

  const embeddedFormUrl = rawFormUrl.includes("embedded=true")
    ? rawFormUrl
    : rawFormUrl.includes("?")
    ? `${rawFormUrl}&embedded=true`
    : `${rawFormUrl}?embedded=true`;

  return (
    <>
      {/* Floating Widget Trigger Button (Góc trái bên dưới) */}
      <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsLoadingIframe(true);
          }}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-medium px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
          title="Gửi phản hồi / Góp ý đồ án ✨"
        >
          <div className="relative">
            <MessageSquareHeart className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
            <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="font-bold text-sm tracking-wide">Góp ý ✨</span>
        </button>

        {/* Pulsing Hint Badge (Nằm bên phải của Nút bấm) */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/30 shadow-lg text-xs font-semibold text-foreground animate-bounce shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            <span>Góp ý đồ án nào! ✨</span>
          </div>
        )}
      </div>

      {/* Feedback Modal Dialog với Google Form Nhúng Trực Tiếp */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-background rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[85vh] max-h-[680px]">
            {/* Header với Gradient hồng tím xinh xắn */}
            <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 px-6 py-4 text-white text-center shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
                  <Heart className="w-5 h-5 text-pink-200 fill-pink-200 animate-pulse" />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  Phản hồi & Đóng góp ý kiến cho TeamHub 💌
                </h3>
              </div>
              <p className="text-xs text-pink-100 font-medium">
                Mọi ý kiến của bạn sẽ tự động lưu vào Google Sheet giúp đồ án hoàn thiện hơn! 🥰
              </p>
            </div>

            {/* Embedded Google Form Body */}
            <div className="relative flex-1 bg-muted/20 w-full overflow-hidden">
              {isLoadingIframe && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-xs z-10">
                  <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
                  <span className="text-xs font-semibold text-muted-foreground animate-pulse">
                    Đang tải Google Form...
                  </span>
                </div>
              )}

              <iframe
                src={embeddedFormUrl}
                title="Google Form Feedback"
                onLoad={() => setIsLoadingIframe(false)}
                className="w-full h-full border-0 rounded-b-2xl"
              >
                Đang tải Google Form...
              </iframe>
            </div>

            {/* Cute Footer */}
            <div className="bg-muted/40 px-6 py-2.5 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                Cảm ơn bạn đã trải nghiệm và hỗ trợ đồ án TeamHub!
              </span>

              <a
                href={rawFormUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 hover:underline shrink-0"
              >
                <span>Mở tab riêng</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
