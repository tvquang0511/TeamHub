// Prisma v7 ("client" engine): requires a driver adapter (or Accelerate).
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import env from '../config/env';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
	adapter,
});

export async function disconnectPrisma() {
	await prisma.$disconnect();
	await pool.end().catch(() => undefined);
}

export default prisma;
