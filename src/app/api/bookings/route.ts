import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { computeEnd, computeDynamicPrice } from "@/lib/utils";
import { isTenDigitPhone, isValidEmailFormat, normalizePhoneDigits } from "@/lib/validation";

/** Normaliza la lista de ids de complementos del body JSON a enteros positivos únicos. */
function parseAddonIdsFromBody(addons: unknown): number[] {
  if (!Array.isArray(addons)) return [];
  const nums = addons
    .map((x: unknown) => Number(x))
    .filter((n): n is number => Number.isInteger(n) && n > 0);
  return [...new Set(nums)];
}

function parsePagination(searchParams: URLSearchParams) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  if (pageRaw === null && limitRaw === null) return null;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitRaw || "10", 10) || 10));
  return { page, limit };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pagination = parsePagination(searchParams);

  const include = {
    service: true,
    serviceVariant: true,
  } as const;

  if (pagination) {
    const { page, limit } = pagination;
    const [total, data] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.findMany({
        include,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return Response.json({
      ok: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  const data = await prisma.booking.findMany({ include, orderBy: { date: "desc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const variantId = Number(body.serviceVariantId);
  if (!Number.isInteger(variantId) || variantId < 1) {
    return errJson(400, "VARIANT_REQUIRED", "Indica una opción de servicio válida (serviceVariantId).");
  }

  const variant = await prisma.serviceVariant.findUnique({
    where: { id: variantId },
    include: { service: true },
  });

  if (!variant || !variant.active || !variant.service.active) {
    return errJson(400, "VARIANT_INVALID", "Opción de servicio no disponible.");
  }

  const serviceIdBody = Number(body.serviceId);
  if (Number.isInteger(serviceIdBody) && serviceIdBody !== variant.serviceId) {
    return errJson(400, "VARIANT_INVALID", "La opción no corresponde al servicio indicado.");
  }

  const service = variant.service;
  const start = new Date(body.date);
  if (isNaN(start.getTime())) return errJson(400, "INVALID_DATE", "Fecha inválida");

  const end = computeEnd(start, variant.durationMin);
  const rawAddonIds = parseAddonIdsFromBody(body.addons);

  const redeemCodeRaw = typeof body.redeemCode === "string" ? body.redeemCode.trim().toUpperCase() : "";

  // Validación de la tarjeta de regalo (canje total, sin Stripe).
  let giftCardId: number | null = null;
  if (redeemCodeRaw) {
    const gc = await prisma.giftCardOrder.findUnique({ where: { redeemCode: redeemCodeRaw } });
    if (!gc) return errJson(404, "GIFT_CARD_NOT_FOUND", "Tarjeta de regalo no encontrada.");
    if (gc.status !== "CONFIRMED") {
      return errJson(
        409,
        "GIFT_CARD_NOT_REDEEMABLE",
        "Esta tarjeta aún no está pagada o fue cancelada y no se puede canjear.",
      );
    }
    if (gc.redeemedAt) {
      return errJson(409, "GIFT_CARD_ALREADY_REDEEMED", "Esta tarjeta de regalo ya fue canjeada.");
    }
    if (gc.serviceId !== service.id) {
      return errJson(
        409,
        "GIFT_CARD_SERVICE_MISMATCH",
        "La tarjeta solo cubre el servicio original con el que fue emitida.",
      );
    }
    if (gc.serviceVariantId !== null && gc.serviceVariantId !== variant.id) {
      return errJson(
        409,
        "GIFT_CARD_VARIANT_MISMATCH",
        "La tarjeta cubre una opción distinta del servicio.",
      );
    }
    if (rawAddonIds.length > 0) {
      return errJson(
        409,
        "GIFT_CARD_NO_ADDONS",
        "El canje de tarjeta no admite complementos. Crea una reserva independiente para ellos.",
      );
    }
    giftCardId = gc.id;
  }

  let addonsTotal = 0;
  let addonsJsonStored: string | null = null;

  if (rawAddonIds.length > 0) {
    const addonRows = await prisma.addon.findMany({
      where: { id: { in: rawAddonIds }, active: true },
    });
    if (addonRows.length !== rawAddonIds.length) {
      return errJson(
        400,
        "ADDON_INVALID",
        "Uno o más complementos no existen o no están disponibles.",
      );
    }
    addonsTotal =
      Math.round(addonRows.reduce((s: number, r: { price: unknown }) => s + Number(r.price), 0) * 100) /
      100;
    addonsJsonStored = JSON.stringify(rawAddonIds);
  }

  const servicePrice = computeDynamicPrice(Number(variant.price), start);
  const computedPrice = Math.round((servicePrice + addonsTotal) * 100) / 100;
  const finalPrice = giftCardId ? 0 : computedPrice;

  const customer = typeof body.customer === "string" ? body.customer.trim() : "";
  if (!customer) {
    return errJson(400, "NAME_REQUIRED", "El nombre es obligatorio.");
  }

  const phoneDigits = normalizePhoneDigits(String(body.phone ?? ""));
  if (!isTenDigitPhone(phoneDigits)) {
    return errJson(400, "PHONE_TEN_DIGITS", "El teléfono debe tener exactamente 10 dígitos.");
  }

  const emailTrim = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmailFormat(emailTrim)) {
    return errJson(400, "INVALID_EMAIL", "Indica un correo electrónico válido.");
  }

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  if (!giftCardId) {
    const clientTotal = Number(body.total);
    if (Number.isFinite(clientTotal) && Math.abs(clientTotal - finalPrice) > 0.02) {
      return errJson(400, "PRICE_MISMATCH", "El total no coincide con el precio calculado.");
    }
  }

  // Reserva normal (sin canje): flujo previo intacto.
  if (!giftCardId) {
    const conflict = await prisma.booking.findFirst({
      where: {
        serviceId: service.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        AND: [{ date: { lt: end } }, { endDate: { gt: start } }],
      },
    });
    if (conflict) return errJson(409, "SLOT_TAKEN", "Horario ocupado");

    const block = await prisma.blockedSlot.findFirst({
      where: { AND: [{ start: { lt: end } }, { end: { gt: start } }] },
    });
    if (block) return errJson(409, "BLOCKED", block.reason || "Bloqueado");

    const data = await prisma.booking.create({
      data: {
        customer,
        phone: phoneDigits,
        email: emailTrim,
        notes,
        serviceId: service.id,
        serviceVariantId: variant.id,
        date: start,
        endDate: end,
        price: finalPrice,
        status: "PENDING",
        addonsJson: addonsJsonStored,
      },
    });
    return Response.json({ ok: true, data });
  }

  // Canje: transacción atómica que re-verifica traslapes y reserva la tarjeta.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          serviceId: service.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          AND: [{ date: { lt: end } }, { endDate: { gt: start } }],
        },
      });
      if (conflict) throw new Error("SLOT_TAKEN");

      const block = await tx.blockedSlot.findFirst({
        where: { AND: [{ start: { lt: end } }, { end: { gt: start } }] },
      });
      if (block) throw new Error("BLOCKED");

      const booking = await tx.booking.create({
        data: {
          customer,
          phone: phoneDigits,
          email: emailTrim,
          notes,
          serviceId: service.id,
          serviceVariantId: variant.id,
          date: start,
          endDate: end,
          price: 0,
          status: "CONFIRMED",
          addonsJson: null,
        },
      });

      // Marca la tarjeta como canjeada solo si sigue sin canjearse.
      const locked = await tx.giftCardOrder.updateMany({
        where: { id: giftCardId!, redeemedAt: null, status: "CONFIRMED" },
        data: {
          redeemedAt: new Date(),
          redeemedBookingId: booking.id,
        },
      });
      if (locked.count !== 1) throw new Error("GIFT_CARD_ALREADY_REDEEMED");

      return booking;
    });

    return Response.json({ ok: true, data: created, redeemed: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SLOT_TAKEN") return errJson(409, "SLOT_TAKEN", "Horario ocupado");
    if (msg === "BLOCKED") return errJson(409, "BLOCKED", "Horario bloqueado");
    if (msg === "GIFT_CARD_ALREADY_REDEEMED") {
      return errJson(409, "GIFT_CARD_ALREADY_REDEEMED", "Esta tarjeta de regalo ya fue canjeada.");
    }
    throw e;
  }
}
