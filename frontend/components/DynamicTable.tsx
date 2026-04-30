/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

type Field = {
  name: string;
  label?: string;
};

type RecordItem = {
  id: string | number;
  data?: Record<string, any>;
  [key: string]: any;
};

export default function DynamicTable({
  fields = [],
  records = [],
}: {
  fields?: Field[];
  records?: RecordItem[];
}) {
  const columns =
    fields.length > 0
      ? fields.map((field) => ({
          key: field.name,
          label: field.label || field.name,
        }))
      : Object.keys(records?.[0]?.data || {}).map((key) => ({
          key,
          label: key,
        }));

  if (!records.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
        No records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-slate-700 px-4 py-3 text-left font-semibold"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="odd:bg-slate-900 even:bg-slate-950">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="border-b border-slate-800 px-4 py-3 text-slate-200"
                >
                  {String(record?.data?.[col.key] ?? record?.[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}