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
    create: { name: "Admin", email: adminEmail, password: hashed, role: "ADMIN" }
  });

  await prisma.service.createMany({
    data: [
      { name: "Masaje Relajante", description: "60 min de relajación.", price: 700.00, durationMin: 60 },
      { name: "Masaje Descontracturante", description: "Alivia tensiones musculares.", price: 850.00, durationMin: 75 },
      { name: "Facial Hidratante", description: "Piel luminosa y fresca.", price: 650.00, durationMin: 50 }
    ],
    skipDuplicates: true
  });
}

main().finally(async () => prisma.$disconnect());