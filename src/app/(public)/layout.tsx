// src/app/(public)/layout.tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <Header />
      {/* <main className="mx-auto max-w-6xl p-4">{children}</main> */}
      <main className="mx-auto">{children}</main>
      <Footer />
    </div>
  );
}
