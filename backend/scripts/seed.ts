import "dotenv/config";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

import prisma, { disconnectPrisma } from "../src/db/prisma";

const PASSWORD = "123456";

async function seed() {
	const passwordHash = await bcrypt.hash(PASSWORD, 10);

	const users = await Promise.all([
		prisma.users.upsert({
			where: { email: "owner@teamhub.local" },
			update: { displayName: "Owner", passwordHash },
			create: { email: "owner@teamhub.local", displayName: "Owner", passwordHash },
		}),
		prisma.users.upsert({
			where: { email: "admin@teamhub.local" },
			update: { displayName: "Admin", passwordHash },
			create: { email: "admin@teamhub.local", displayName: "Admin", passwordHash },
		}),
		prisma.users.upsert({
			where: { email: "member@teamhub.local" },
			update: { displayName: "Member", passwordHash },
			create: { email: "member@teamhub.local", displayName: "Member", passwordHash },
		}),
	]);

	const workspace = await prisma.workspaces.findFirst({
		where: { name: "TeamHub Demo" },
	});

	const ws =
		workspace ??
		(await prisma.workspaces.create({
			data: { name: "TeamHub Demo", description: "Workspace demo cho analytics" },
		}));

	await prisma.workspace_members.upsert({
		where: { workspaceId_userId: { workspaceId: ws.id, userId: users[0].id } },
		update: { role: "OWNER" },
		create: { workspaceId: ws.id, userId: users[0].id, role: "OWNER" },
	});

	await prisma.workspace_members.upsert({
		where: { workspaceId_userId: { workspaceId: ws.id, userId: users[1].id } },
		update: { role: "ADMIN" },
		create: { workspaceId: ws.id, userId: users[1].id, role: "ADMIN" },
	});

	await prisma.workspace_members.upsert({
		where: { workspaceId_userId: { workspaceId: ws.id, userId: users[2].id } },
		update: { role: "MEMBER" },
		create: { workspaceId: ws.id, userId: users[2].id, role: "MEMBER" },
	});

	const board =
		(await prisma.boards.findFirst({
			where: { workspaceId: ws.id, name: "Growth Board" },
		})) ??
		(await prisma.boards.create({
			data: {
				workspaceId: ws.id,
				name: "Growth Board",
				description: "Board mau de xem thong ke",
				visibility: "WORKSPACE",
				backgroundLeftColor: "#34d399",
				backgroundRightColor: "#0ea5e9",
				backgroundSplitPct: 55,
				position: new Prisma.Decimal(1024),
			},
		}));

	await prisma.board_members.upsert({
		where: { boardId_userId: { boardId: board.id, userId: users[0].id } },
		update: { role: "OWNER" },
		create: { boardId: board.id, userId: users[0].id, role: "OWNER" },
	});

	await prisma.board_members.upsert({
		where: { boardId_userId: { boardId: board.id, userId: users[1].id } },
		update: { role: "ADMIN" },
		create: { boardId: board.id, userId: users[1].id, role: "ADMIN" },
	});

	await prisma.board_members.upsert({
		where: { boardId_userId: { boardId: board.id, userId: users[2].id } },
		update: { role: "MEMBER" },
		create: { boardId: board.id, userId: users[2].id, role: "MEMBER" },
	});

	const lists = await prisma.lists.findMany({
		where: { boardId: board.id },
	});

	const ensureList = async (name: string, position: number, flags?: { isDoing?: boolean; isDone?: boolean }) => {
		const existing = lists.find((l) => l.name === name);
		if (existing) {
			return prisma.lists.update({
				where: { id: existing.id },
				data: {
					isDoing: flags?.isDoing ?? existing.isDoing,
					isDone: flags?.isDone ?? existing.isDone,
				},
			});
		}
		return prisma.lists.create({
			data: {
				boardId: board.id,
				name,
				position: new Prisma.Decimal(position),
				isDoing: flags?.isDoing ?? false,
				isDone: flags?.isDone ?? false,
			},
		});
	};

	const backlog = await ensureList("Backlog", 1024);
	const doing = await ensureList("In Progress", 2048, { isDoing: true });
	const done = await ensureList("Done", 3072, { isDone: true });

	await prisma.cards.createMany({
		data: [
			{
				listId: backlog.id,
				title: "Research onboarding flow",
				description: "Thu nghiem tuong tac dau tien",
				position: new Prisma.Decimal(1024),
			},
			{
				listId: doing.id,
				title: "Build analytics dashboard",
				description: "UI cho board analytics",
				position: new Prisma.Decimal(2048),
			},
			{
				listId: done.id,
				title: "Set up board roles",
				description: "Owner/Admin access",
				position: new Prisma.Decimal(3072),
				isDone: true,
			},
		],
		skipDuplicates: true,
	});

	console.log("Seed completed. Password for all users: 123456");
	console.log("Users:");
	console.log("- owner@teamhub.local (OWNER)");
	console.log("- admin@teamhub.local (ADMIN)");
	console.log("- member@teamhub.local (MEMBER)");
}

seed()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await disconnectPrisma();
	});
