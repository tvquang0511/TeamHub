import { Prisma } from "@prisma/client";
import prisma from "../../src/infrastructure/database/prisma";
import type { users, boards, labels, lists } from "@prisma/client";

export async function seedCards(
  board: boards,
  listsMap: Record<string, lists>,
  labelsList: labels[],
  usersList: users[]
) {
  const [owner, admin, dev, designer, qa, member] = usersList;

  const backlog = listsMap["Backlog 📋"];
  const inProgress = listsMap["In Progress ⚙️"];
  const codeReview = listsMap["Code Review 🔍"];
  const done = listsMap["Done 🎉"];

  if (!backlog || !inProgress || !codeReview || !done) return;

  const cardsData = [
    // Done Cards
    {
      title: "🚀 Giao diện Dark/Light Mode & TopBar Glassmorphic",
      description: "Tích hợp ThemeProvider, nút đổi giao diện ☀️/🌙 và thanh tìm kiếm nhanh Ctrl+K",
      listId: done.id,
      isDone: true,
      position: 1024,
      assigneeId: dev!.id,
      labelName: "Frontend",
      comments: [
        { authorId: designer!.id, text: "Giao diện mượt mà và phối màu Dark Mode rất đẹp!" },
        { authorId: admin!.id, text: "Đã test thành công trên Chrome & Firefox." },
      ],
      checklists: [
        { title: "Tạo ThemeProvider", items: ["Cấu hình localStorage", "Hỗ trợ System preference"] },
        { title: "Nâng cấp TopBar", items: ["Thêm icon mặt trời/mặt trăng", "Căn giữa thanh Command Search"] },
      ],
    },
    {
      title: "🤖 Tích hợp Trợ lý Gemini AI Phân rã Task tự động",
      description: "Xây dựng service kết nối Gemini API để phân rã 1 task lớn thành danh sách sub-tasks",
      listId: done.id,
      isDone: true,
      position: 2048,
      assigneeId: dev!.id,
      labelName: "AI/ML",
      comments: [{ authorId: owner!.id, text: "Tính năng này sẽ tạo ấn tượng mạnh khi bảo vệ đồ án." }],
      checklists: [
        { title: "Backend Integration", items: ["Kết nối Google GenAI SDK", "Tạo Endpoint POST /api/cards/:id/ai-breakdown"] },
      ],
    },

    // In Progress Cards
    {
      title: "⏱️ Đồng hồ bấm giờ Timer & Logged Hours trên Card",
      description: "Thêm nút Start/Stop Timer đo số phút làm việc thực tế và so sánh với Estimated Hours",
      listId: inProgress.id,
      isDone: false,
      position: 1024,
      assigneeId: member!.id,
      labelName: "Frontend",
      comments: [{ authorId: dev!.id, text: "Chú ý xử lý lưu thời gian dở dang khi tắt trình duyệt." }],
      checklists: [
        { title: "UI Components", items: ["Nút Start/Stop Timer", "Thanh Progress bar Estimate vs Actual"] },
      ],
    },
    {
      title: "🔔 Chuông thông báo In-App Notification Hub & Socket.IO Push",
      description: "Tự động phát thông báo khi được gán Task, mention hoặc card trễ hạn",
      listId: inProgress.id,
      isDone: false,
      position: 2048,
      assigneeId: dev!.id,
      labelName: "Backend",
      comments: [{ authorId: qa!.id, text: "Đang kiểm thử socket message payload." }],
      checklists: [
        { title: "Database & Socket", items: ["Tạo schema Notification", "Thêm Socket room user:{id}"] },
      ],
    },

    // Code Review Cards
    {
      title: "📊 Đa góc nhìn Multi-View (Timeline / Gantt Chart)",
      description: "Bổ sung tab chuyển đổi góc nhìn Timeline hiển thị mốc thời gian hạn chót",
      listId: codeReview.id,
      isDone: false,
      position: 1024,
      assigneeId: designer!.id,
      labelName: "UI/UX",
      comments: [{ authorId: admin!.id, text: "Đang review giao diện trên màn hình 14 inch." }],
      checklists: [
        { title: "Multi-View Engine", items: ["Viết BoardTimelineView", "Xử lý kéo thả đổi dueAt"] },
      ],
    },
    {
      title: "🛠️ Tự động hóa CI Pipeline với GitHub Actions",
      description: "Cấu hình tự động chạy Typecheck, ESLint và Build cho 3 dự án khi Push code",
      listId: codeReview.id,
      isDone: false,
      position: 2048,
      assigneeId: dev!.id,
      labelName: "DevOps",
      comments: [{ authorId: qa!.id, text: "CI chạy rất nhanh (dưới 15 giây)." }],
      checklists: [
        { title: "GitHub Actions", items: ["Tạo .github/workflows/ci.yml", "Hỗ trợ kiểm tra tất cả các nhánh"] },
      ],
    },

    // Backlog Cards
    {
      title: "💬 Chuyển đổi Tin nhắn Chat thành Card (1-Click Convert)",
      description: "Cho phép người dùng nhấp vào tin nhắn trong Board Chat để tạo ngay Card Kanban",
      listId: backlog.id,
      isDone: false,
      position: 1024,
      assigneeId: member!.id,
      labelName: "Frontend",
      comments: [],
      checklists: [],
    },
    {
      title: "👥 Hiển thị con trỏ chuột thời gian thực (Live Cursor)",
      description: "Hiển thị vị trí chuột và avatar của các đồng nghiệp đang cùng xem Board",
      listId: backlog.id,
      isDone: false,
      position: 2048,
      assigneeId: dev!.id,
      labelName: "Frontend",
      comments: [],
      checklists: [],
    },
    {
      title: "🐋 Cấu hình Nginx Production SSL & WebSocket Upgrade",
      description: "Chuẩn bị file docker-compose.prod.yml và SSL Certbot triển khai lên VPS",
      listId: backlog.id,
      isDone: false,
      position: 3072,
      assigneeId: admin!.id,
      labelName: "DevOps",
      comments: [],
      checklists: [],
    },
  ];

  for (const c of cardsData) {
    const card = await prisma.cards.create({
      data: {
        listId: c.listId,
        title: c.title,
        description: c.description,
        position: new Prisma.Decimal(c.position),
        isDone: c.isDone,
        dueAt: new Date(Date.now() + (c.isDone ? -2 : 5) * 24 * 60 * 60 * 1000),
      },
    });

    // Assignee
    await prisma.card_assignees.create({
      data: { cardId: card.id, userId: c.assigneeId },
    });

    // Label attachment
    const targetLabel = labelsList.find((l) => l.name === c.labelName);
    if (targetLabel) {
      await prisma.card_labels.create({
        data: { cardId: card.id, labelId: targetLabel.id },
      });
    }

    // Checklists
    for (let i = 0; i < c.checklists.length; i++) {
      const ch = c.checklists[i]!;
      const checklist = await prisma.checklists.create({
        data: {
          cardId: card.id,
          title: ch.title,
          position: new Prisma.Decimal((i + 1) * 1024),
        },
      });

      for (let j = 0; j < ch.items.length; j++) {
        await prisma.checklist_items.create({
          data: {
            checklistId: checklist.id,
            title: ch.items[j]!,
            isDone: c.isDone || j === 0,
            position: new Prisma.Decimal((j + 1) * 1024),
          },
        });
      }
    }

    // Comments
    for (const cm of c.comments) {
      await prisma.card_comments.create({
        data: {
          cardId: card.id,
          authorId: cm.authorId,
          content: cm.text,
        },
      });
    }

    // Activity Log
    await prisma.activities.create({
      data: {
        actorId: c.assigneeId,
        workspaceId: board.workspaceId,
        boardId: board.id,
        cardId: card.id,
        type: c.isDone ? "CARD_UPDATED" : "CARD_CREATED",
        payload: { title: c.title },
      },
    });
  }
}
