import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminNav() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-6xl p-3 flex items-center gap-4 text-sm">
        <Link href="/admin" className="underline">Inicio</Link>
        <Link href="/admin/services" className="underline">Servicios</Link>
        <Link href="/admin/bookings" className="underline">Reservas</Link>
        <Link href="/admin/blocked" className="underline">Bloqueos</Link>
        <Link href="/admin/dashboard" className="underline">Dashboard</Link>

        {/* Botón logout alineado a la derecha */}
        <LogoutButton />
      </div>
    </nav>
  );
}