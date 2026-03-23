import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-bold text-slate-900 transition hover:opacity-90">
          <Image
            src="/logo_fondo_blanco.png"
            alt="Spa BodyMax"
            width={300}
            height={100}
            className="h-20 w-auto object-contain sm:h-20"
            priority
          />
          <span className="hidden sm:inline">Spa BodyMax</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/auth/login" className="underline">Admin</Link>
        </nav>
      </div>
    </header>
  );
}