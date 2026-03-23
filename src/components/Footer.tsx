export default function Footer() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto max-w-6xl p-4 text-sm text-slate-500 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Spa BodyMax</span>
        <a href="https://wa.me/5215555555555" target="_blank" className="underline">WhatsApp</a>
      </div>
    </footer>
  );
}