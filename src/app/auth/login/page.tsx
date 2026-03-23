"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: true, callbackUrl: "/admin" });
    if ((res as any)?.error) setError("Credenciales inválidas");
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <form onSubmit={submit} className="w-full max-w-sm border rounded-2xl p-6 space-y-3">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <input className="w-full border rounded-xl p-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded-xl p-2" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full py-2 rounded-xl bg-slate-900 text-white">Entrar</button>
      </form>
    </div>
  );
}