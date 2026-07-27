# ⚙️ TeamHub Standalone Worker Service

Standalone Async Worker Service powered by **BullMQ**, **ioredis**, **Nodemailer SMTP**, and **PostgreSQL**.

> ⚠️ **Note for Reviewers & Recruiters**: Due to Free Tier limitations on Render cloud hosting, the standalone worker service is configured by default for **Local/Self-hosted** execution (`npm start`). If you wish to test live email reminders and daily standup worker on cloud staging, please contact:
> - **Tel/Zalo**: `0357131476`
> - **Email**: `tvquang.working@gmail.com`

## 🚀 Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Install & Run
```bash
npm install
npm run dev
```

### 3. Build & Typecheck
```bash
npm run typecheck
npm run build
npm start
```
