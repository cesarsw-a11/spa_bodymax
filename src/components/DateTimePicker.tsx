"use client";
export default function DateTimePicker({
  value,
  onChange,
  minDate,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  minDate?: Date;
}) {
  const iso = value ? new Date(value).toISOString().slice(0,16) : ""; // yyyy-MM-ddTHH:mm
  const minIso = minDate ? new Date(minDate).toISOString().slice(0, 16) : undefined;
  return (
    <input
      type="datetime-local"
      className="mt-1 w-full rounded-xl border p-2"
      value={iso}
      min={minIso}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  );
}