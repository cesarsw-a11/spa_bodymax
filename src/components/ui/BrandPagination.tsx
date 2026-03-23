"use client";

function getVisiblePages(current: number, total: number): (number | "gap")[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

type BrandPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  /** Etiqueta para el resumen, ej. "servicios" / "reservas" */
  itemLabel?: string;
  className?: string;
};

/**
 * Paginador alineado con la UI del SPA (violeta, bordes suaves, gradientes discretos).
 */
export function BrandPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  itemLabel = "registros",
  className = "",
}: BrandPaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const visible = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label="Paginación"
      className={`mt-4 flex flex-col gap-3 rounded-2xl border border-violet-100/90 bg-gradient-to-r from-violet-50/40 via-white to-fuchsia-50/30 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 ${className}`}
    >
      <p className="text-center text-xs font-medium text-slate-600 sm:text-left">
        <span className="text-violet-700">{start}–{end}</span>
        <span className="text-slate-400"> de </span>
        <span className="font-semibold text-slate-800">{totalItems}</span>
        <span className="text-slate-500"> {itemLabel}</span>
        {totalPages > 1 ? (
          <span className="ml-1 text-slate-400">
            · Página {page} de {totalPages}
          </span>
        ) : null}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        <ul className="flex items-center gap-1">
          {visible.map((item, idx) =>
            item === "gap" ? (
              <li key={`gap-${idx}`} className="px-1 text-slate-400" aria-hidden>
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPageChange(item)}
                  className={`flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-xl px-2.5 text-sm font-semibold transition ${
                    item === page
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25"
                      : "border border-transparent text-slate-600 hover:border-violet-200 hover:bg-white hover:text-violet-800"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
