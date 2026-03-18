// Prisma v7 ("client" engine): requires a driver adapter (or Accelerate).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl || typeof datasourceUrl !== 'string') {
  throw new Error('DATABASE_URL is missing or not a string');
}

const pool = new Pool({ connectionString: datasourceUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
	adapter,
});

export async function disconnectPrisma() {
	await prisma.$disconnect();
	await pool.end().catch(() => undefined);
}

export default prisma;
