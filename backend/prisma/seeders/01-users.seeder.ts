import bcrypt from "bcrypt";
import prisma from "../../src/db/prisma";

const PASSWORD = "123456";

export async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const usersData = [
    {
      email: "owner@teamhub.local",
      displayName: "Alex Owner (CEO)",
      description: "Workspace Founder & Executive Product Lead",
    },
    {
      email: "admin@teamhub.local",
      displayName: "Sarah Admin (PM)",
      description: "Lead Product Manager & Agile Coach",
    },
    {
      email: "dev@teamhub.local",
      displayName: "David Developer (Tech Lead)",
      description: "Senior Fullstack Engineer & System Architect",
    },
    {
      email: "designer@teamhub.local",
      displayName: "Emily Designer (UI/UX)",
      description: "Senior Product Designer & Design System Lead",
    },
    {
      email: "qa@teamhub.local",
      displayName: "Michael QA (Automation Lead)",
      description: "Quality Assurance & Test Automation Specialist",
    },
    {
      email: "member@teamhub.local",
      displayName: "Jessica Member (Frontend)",
      description: "React & TypeScript Specialist",
    },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.users.create({
        data: {
          email: u.email,
          displayName: u.displayName,
          description: u.description,
          passwordHash,
        },
      })
    )
  );

  return users;
}
