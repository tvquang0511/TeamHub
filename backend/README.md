# ⚡ TeamHub Backend API Service

Enterprise RESTful API and Realtime Socket.IO Server built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, **Google Gemini AI**, **PostgreSQL**, **Redis**, and **Zod**.

## 🚀 Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Choose your execution mode in `.env`:
- **[MODE 1] LOCAL DEVELOPMENT**: For Docker Compose / Local PostgreSQL & Redis.
- **[MODE 2] CLOUD PRODUCTION**: For Supabase Postgres, Valkey/Upstash Redis, Supabase S3, and Google Gemini 2.5 Flash API Key.

### 2. Database Migration & Seed
```bash
npm install
npx prisma db push
npm run seed:demo
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Typecheck & Build
```bash
npm run typecheck
npm run build
```
