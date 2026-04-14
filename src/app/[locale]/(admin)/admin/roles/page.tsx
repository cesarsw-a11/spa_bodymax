"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import {
  ADMIN_MODULES,
  DEFAULT_ADMIN_PERMISSIONS,
  type AdminModule,
  type AdminPermissions,
} from "@/lib/admin-permissions";

type RoleRow = {
  id: number;
  name: string;
  active: boolean;
  usersCount: number;
  permissions: AdminPermissions;
};

export default function AdminRolesPage() {
  const t = useTranslations("adminRoles");
  const tApi = useTranslations("apiErrors");
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<AdminPermissions>({ ...DEFAULT_ADMIN_PERMISSIONS });

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/admin/roles", { credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as {
      data?: RoleRow[];
      errorCode?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
    setRows(json.data || []);
  }, [tApi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchRoles();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("loadErr"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, t]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setActive(true);
    setPermissions({ ...DEFAULT_ADMIN_PERMISSIONS });
  }

  function startEdit(row: RoleRow) {
    setEditingId(row.id);
    setName(row.name);
    setActive(row.active);
    setPermissions(row.permissions);
  }

  function togglePermission(mod: AdminModule) {
    setPermissions((prev) => ({ ...prev, [mod]: !prev[mod] }));
  }

  async function saveRole() {
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), active, permissions };
      const res = await fetch(editingId ? `/api/admin/roles/${editingId}` : "/api/admin/roles", {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string };
      if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
      await fetchRoles();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveErr"));
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { errorCode?: string; error?: string };
      if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
      await fetchRoles();
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deleteErr"));
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
          {!loading && rows.length === 0 ? <li className="text-sm text-slate-500">{t("empty")}</li> : null}
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{t("employeesCount", { n: row.usersCount })}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${row.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {row.active ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ADMIN_MODULES.filter((m) => row.permissions[m]).map((m) => (
                  <span key={m} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                    {t(`module_${m}`)}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg border border-violet-200 px-3 py-1 text-sm text-violet-700" onClick={() => startEdit(row)}>
                  {t("edit")}
                </button>
                <button className="rounded-lg border border-rose-200 px-3 py-1 text-sm text-rose-700" onClick={() => void removeRole(row.id)}>
                  {t("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{editingId ? t("editTitle") : t("newTitle")}</h2>
        <div className="mt-3 space-y-3">
          <input
            className="w-full rounded-xl border border-slate-200 p-2.5"
            placeholder={t("namePh")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            {t("active")}
          </label>
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">{t("modules")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ADMIN_MODULES.map((mod) => (
                <label key={mod} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={permissions[mod]} onChange={() => togglePermission(mod)} />
                  {t(`module_${mod}`)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving || !name.trim()}
              onClick={() => void saveRole()}
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
