import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const data = await prisma.blockedSlot.findMany({ orderBy: { start: "desc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const data = await prisma.blockedSlot.create({ data: { start: new Date(body.start), end: new Date(body.end), reason: body.reason } });
  return Response.json({ ok: true, data });
}