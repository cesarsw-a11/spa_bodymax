import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@spabodymax.com";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";

  const hashed = await bcrypt.hash(adminPass, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Admin", email: adminEmail, password: hashed, role: "ADMIN" },
  });
}

main().finally(async () => prisma.$disconnect());
