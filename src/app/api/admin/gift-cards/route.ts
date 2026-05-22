import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/auth";
import { decimalToNumber } from "@/lib/giftCard";
import { getTenantId } from "@/lib/tenant";
import type { Prisma, GiftCardStatus } from "@prisma/client";

export const runtime = "nodejs";

const PAGE_LIMIT_MAX = 50;
const DEFAULT_LIMIT = 10;

function parseStatus(raw: string | null): GiftCardStatus | null {
  if (!raw) return null;
  if (raw === "PENDING" || raw === "CONFIRMED" || raw === "CANCELLED") return raw;
  return null;
}

function parseRedeemed(raw: string | null): "only" | "none" | null {
  if (raw === "only") return "only";
  if (raw === "none") return "none";
  return null;
}

export async function GET(req: Request) {
  const forbidden = await requireAdminModule("giftCards");
  if (forbidden) return forbidden;
  const tenantId = await getTenantId();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  const status = parseStatus(searchParams.get("status"));
  const redeemed = parseRedeemed(searchParams.get("redeemed"));
  const q = (searchParams.get("q") ?? "").trim();

  const where: Prisma.GiftCardOrderWhereInput = { tenantId };
  if (status) where.status = status;
  if (redeemed === "only") where.redeemedAt = { not: null };
  if (redeemed === "none") where.redeemedAt = null;
  if (q) {
    where.OR = [
      { redeemCode: { contains: q } },
      { recipientName: { contains: q } },
      { senderName: { contains: q } },
      { senderEmail: { contains: q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.giftCardOrder.count({ where }),
    prisma.giftCardOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { redeemedBooking: { select: { id: true, date: true, customer: true, status: true } } },
    }),
  ]);

  return Response.json({
    ok: true,
    data: rows.map((g) => ({
      id: g.id,
      status: g.status,
      amount: decimalToNumber(g.amount),
      currency: g.currency,
      serviceNameSnapshot: g.serviceNameSnapshot,
      serviceNameEnSnapshot: g.serviceNameEnSnapshot,
      variantLabelSnapshot: g.variantLabelSnapshot,
      variantLabelEnSnapshot: g.variantLabelEnSnapshot,
      variantDurationSnapshot: g.variantDurationSnapshot,
      recipientName: g.recipientName,
      senderName: g.senderName,
      senderEmail: g.senderEmail,
      redeemCode: g.redeemCode,
      redeemedAt: g.redeemedAt,
      redeemedBooking: g.redeemedBooking,
      createdAt: g.createdAt,
    })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}
