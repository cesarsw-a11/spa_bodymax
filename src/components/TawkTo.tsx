import Script from "next/script";

const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();
const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim();

/**
 * Chat Tawk.to (widget flotante).
 *
 * Obtén los IDs en: panel Tawk.to → **Administración** → **Canales** → **Widget de chat**
 * → pestaña **Instalar** / código de instalación: la URL es
 * `https://embed.tawk.to/PROPERTY_ID/WIDGET_ID`
 *
 * Variables en `.env` / Vercel:
 * - `NEXT_PUBLIC_TAWK_PROPERTY_ID`
 * - `NEXT_PUBLIC_TAWK_WIDGET_ID`
 */
export default function TawkTo() {
  if (!propertyId || !widgetId) return null;

  return (
    <Script
      id="tawkto-embed"
      strategy="afterInteractive"
      src={`https://embed.tawk.to/${propertyId}/${widgetId}`}
      charSet="UTF-8"
      crossOrigin="anonymous"
    />
  );
}
