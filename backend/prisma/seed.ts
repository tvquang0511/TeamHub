import "dotenv/config";
import prisma, { disconnectPrisma } from "../src/infrastructure/database/prisma";
import { seedUsers } from "./seeders/01-users.seeder";
import { seedWorkspaces } from "./seeders/02-workspaces.seeder";
import { seedBoards } from "./seeders/03-boards.seeder";
import { seedCards } from "./seeders/04-cards.seeder";

async function cleanDatabase() {
  const t0 = Date.now();
  process.stdout.write("[0/5] 🧹 Cleaning & wiping existing database records... ");

  // Wipe data in correct dependency order
  await prisma.activities.deleteMany({});
  await prisma.card_comments.deleteMany({});
  await prisma.checklist_items.deleteMany({});
  await prisma.checklists.deleteMany({});
  await prisma.card_labels.deleteMany({});
  await prisma.labels.deleteMany({});
  await prisma.card_assignees.deleteMany({});
  await prisma.card_attachments.deleteMany({});
  await prisma.board_message_attachments.deleteMany({});
  await prisma.board_messages.deleteMany({});
  await prisma.cards.deleteMany({});
  await prisma.lists.deleteMany({});
  await prisma.board_members.deleteMany({});
  await prisma.boards.deleteMany({});
  await prisma.board_metrics_daily.deleteMany({});
  await prisma.board_metrics_monthly.deleteMany({});
  await prisma.workspace_invites.deleteMany({});
  await prisma.workspace_members.deleteMany({});
  await prisma.workspaces.deleteMany({});
  await prisma.refresh_tokens.deleteMany({});
  await prisma.password_reset_tokens.deleteMany({});
  await prisma.reminder_jobs.deleteMany({});
  await prisma.users.deleteMany({});

  console.log(`✔ (Database completely wiped) [${Date.now() - t0}ms]`);
}

async function main() {
  const startTime = Date.now();

  console.log(`
┌──────────────────────────────────────────────────────────┐
│ 🌱  TEAMHUB ENTERPRISE SEEDER SYSTEM (CLEAN SEED)        │
│     Environment: ${process.env.NODE_ENV || "development"} | Engine: Prisma ORM         │
└──────────────────────────────────────────────────────────┘
`);

  // Step 0: Clean DB
  await cleanDatabase();

  // Step 1: Users
  const t1 = Date.now();
  process.stdout.write("[1/4] 👥 Seeding Users & Roles... ");
  const users = await seedUsers();
  console.log(`✔ (${users.length} users created) [${Date.now() - t1}ms]`);

  // Step 2: Workspaces
  const t2 = Date.now();
  process.stdout.write("[2/4] 🏢 Seeding Workspaces & Members... ");
  const workspaces = await seedWorkspaces(users);
  console.log(`✔ (2 Workspaces created: '${workspaces.wsEngineering.name}', '${workspaces.wsMarketing.name}') [${Date.now() - t2}ms]`);

  // Step 3: Boards & Lists & Labels
  const t3 = Date.now();
  process.stdout.write("[3/4] 📋 Seeding Boards, Lists & Labels... ");
  const { boardSprint, labels, sprintListsMap } = await seedBoards(workspaces, users);
  console.log(`✔ (3 Boards, 4 Kanban Lists, 6 Labels created) [${Date.now() - t3}ms]`);

  // Step 4: Cards & Checklists & Comments
  const t4 = Date.now();
  process.stdout.write("[4/4] 🗂️ Seeding Rich Cards, Checklists, Assignees & Comments... ");
  await seedCards(boardSprint, sprintListsMap, labels, users);
  console.log(`✔ (Cards, checklists, assignees & activity logs seeded) [${Date.now() - t4}ms]`);

  const totalTime = Date.now() - startTime;

  console.log(`
────────────────────────────────────────────────────────────
🎉 SEEDING COMPLETED SUCCESSFULLY IN ${totalTime}ms

🔑 Default Credentials (Password for all users: "123456"):
   • Owner:    owner@teamhub.local     (Role: CEO / OWNER)
   • Admin:    admin@teamhub.local     (Role: PM / ADMIN)
   • Dev:      dev@teamhub.local       (Role: TECH LEAD)
   • Designer: designer@teamhub.local  (Role: UI/UX LEAD)
   • QA:       qa@teamhub.local        (Role: QA LEAD)
   • Member:   member@teamhub.local    (Role: DEVELOPER)
────────────────────────────────────────────────────────────
`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seeding failed with error:\n", e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
