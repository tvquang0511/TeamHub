# Frontend — Tailwind CSS + shadcn/ui (ngắn)

## 1) Tailwind CSS là gì?
- Utility-first CSS: style bằng class (`flex`, `gap-4`, `bg-*`, `p-6`...).
- Ưu điểm: tốc độ, nhất quán, ít context switch.
- Nhược: class dài; cần convention.

**TeamHub dùng thế nào:**
- Layout Kanban (flex + scroll area).
- Responsive spacing/typography.
- Conditional classes theo state (dragging/hover).

## 2) shadcn/ui là gì?
- Bộ UI components “copy into your codebase” (thường dựa trên Radix UI + Tailwind).
- Bạn kiểm soát code component (khác với UI library đóng).

**TeamHub dùng thế nào:**
- Button, Dialog, DropdownMenu, Sheet, ScrollArea, Input, Textarea, Avatar...
- Patterns: composition + variant props.

## 3) Câu hỏi hay gặp
1) *Tailwind có làm app khó maintain?*
- Nếu có naming convention + component hóa (Button, Dialog, Card item…) thì ổn.

2) *Vì sao chọn shadcn?*
- Ship nhanh, UI consistent, vẫn custom được vì code nằm trong repo.
