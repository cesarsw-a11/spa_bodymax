export default function AdminHome() {
  const shortcuts = [
    { href: "/admin/dashboard", label: "Ver dashboard", desc: "Métricas y próximas citas." },
    { href: "/admin/services", label: "Gestionar servicios", desc: "Alta y activación de tratamientos." },
    { href: "/admin/bookings", label: "Gestionar reservas", desc: "Confirmar o cancelar citas." },
    { href: "/admin/blocked", label: "Bloquear horarios", desc: "Restringe fechas y horas no disponibles." },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-400 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <p className="mt-1 text-sm text-white/90">
          Administra reservas, servicios y disponibilidad desde una sola vista.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {shortcuts.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}