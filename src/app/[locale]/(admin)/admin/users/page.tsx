"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";

type RoleOption = { id: number; name: string; active: boolean };
type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  adminRoleId: number | null;
  adminRole: RoleOption | null;
};

export default function AdminUsersPage() {
  const t = useTranslations("adminUsers");
  const tApi = useTranslations("apiErrors");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("ADMIN");
  const [adminRoleId, setAdminRoleId] = useState<string>("");

  const activeRoleOptions = useMemo(() => roles.filter((r) => r.active), [roles]);

  const fetchAll = useCallback(async () => {
    const [uRes, rRes] = await Promise.all([
      fetch("/api/admin/users", { credentials: "include" }),
      fetch("/api/admin/roles", { credentials: "include" }),
    ]);
    const uJson = (await uRes.json().catch(() => ({}))) as {
      data?: UserRow[];
      errorCode?: string;
      error?: string;
    };
    const rJson = (await rRes.json().catch(() => ({}))) as {
      data?: (RoleOption & { usersCount?: number })[];
      errorCode?: string;
      error?: string;
    };
    if (!uRes.ok) throw new Error(resolveApiErrorMessage(uJson, tApi));
    if (!rRes.ok) throw new Error(resolveApiErrorMessage(rJson, tApi));
    setUsers(uJson.data || []);
    setRoles((rJson.data || []).map((r) => ({ id: r.id, name: r.name, active: r.active })));
  }, [tApi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchAll();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("loadErr"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll, t]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("ADMIN");
    setAdminRoleId("");
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setAdminRoleId(u.adminRoleId ? String(u.adminRoleId) : "");
  }

  async function saveUser() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || undefined,
        role,
        adminRoleId: role === "ADMIN" && adminRoleId ? Number(adminRoleId) : null,
      };
      const url = editingId ? `/api/admin/users/${editingId}` : "/api/admin/users";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string };
      if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveErr"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        {error ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {loading ? <li className="text-sm text-slate-500">{t("loading")}</li> : null}
          {!loading && users.length === 0 ? <li className="text-sm text-slate-500">{t("empty")}</li> : null}
          {users.map((u) => (
            <li key={u.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{u.name}</p>
              <p className="text-sm text-slate-600">{u.email}</p>
              <p className="mt-1 text-xs text-violet-700">
                {u.role === "ADMIN"
                  ? u.adminRole?.name
                    ? `${t("adminWithRole")}: ${u.adminRole.name}`
                    : t("superadmin")
                  : t("roleUser")}
              </p>
              <button className="mt-2 rounded-lg border border-violet-200 px-3 py-1 text-sm text-violet-700" onClick={() => startEdit(u)}>
                {t("edit")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{editingId ? t("editTitle") : t("newTitle")}</h2>
        <div className="mt-3 space-y-3">
          <input className="w-full rounded-xl border border-slate-200 p-2.5" placeholder={t("namePh")} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-xl border border-slate-200 p-2.5" placeholder={t("emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 p-2.5"
            placeholder={editingId ? t("passwordOptionalPh") : t("passwordPh")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select className="w-full rounded-xl border border-slate-200 p-2.5" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}>
            <option value="ADMIN">{t("roleAdmin")}</option>
            <option value="USER">{t("roleUser")}</option>
          </select>
          {role === "ADMIN" ? (
            <select
              className="w-full rounded-xl border border-slate-200 p-2.5"
              value={adminRoleId}
              onChange={(e) => setAdminRoleId(e.target.value)}
            >
              <option value="">{t("superadmin")}</option>
              {activeRoleOptions.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex gap-2">
            <button
              disabled={saving || !name.trim() || !email.trim() || (!editingId && password.length < 6)}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void saveUser()}
            >
              {editingId ? t("saveChanges") : t("create")}
            </button>
            {editingId ? (
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm" onClick={resetForm}>
                {t("cancel")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
