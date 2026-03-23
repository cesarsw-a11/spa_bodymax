import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
        <Link href="/" className="font-bold">Spa BodyMax</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/reserve" className="underline">Reservar</Link>
          <Link href="/auth/login" className="underline">Admin</Link>
        </nav>
      </div>
    </header>
  );
}