"use client";

import { useMemo, useState } from "react";

type Field = {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
};

type DynamicFormProps = {
  fields: Field[];
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
};

function buildInitialValues(fields: Field[]) {
  const obj: Record<string, unknown> = {};

  for (const field of fields) {
    obj[field.name] = field.type === "checkbox" ? false : "";
  }

  return obj;
}

export default function DynamicForm({ fields, onSubmit }: DynamicFormProps) {
  const initialValues = useMemo(() => buildInitialValues(fields), [fields]);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => initialValues);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(name: string, value: string | number | boolean) {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmitting(true);
      await onSubmit(formData);
      setFormData(buildInitialValues(fields));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const label = field.label || field.name;
        const value = formData[field.name];

        if (field.type === "select") {
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                {label}
              </label>
              <select
                value={String(value ?? "")}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                required={field.required}
              >
                <option value="">Select {label}</option>
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "checkbox") {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <input
                id={field.name}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor={field.name} className="text-sm font-medium text-slate-200">
                {label}
              </label>
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                {label}
              </label>
              <textarea
                value={String(value ?? "")}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="min-h-[100px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                placeholder={`Enter ${label}`}
                required={field.required}
              />
            </div>
          );
        }

        const inputType =
          field.type === "email" ||
          field.type === "number" ||
          field.type === "date"
            ? field.type
            : "text";

        return (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              {label}
            </label>
            <input
              type={inputType}
              value={String(value ?? "")}
              onChange={(e) =>
                handleChange(
                  field.name,
                  field.type === "number" ? Number(e.target.value) : e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder={`Enter ${label}`}
              required={field.required}
            />
          </div>
        );
      })}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Create Record"}
      </button>
    </form>
  );
}