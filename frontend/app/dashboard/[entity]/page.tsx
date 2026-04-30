/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DynamicForm from "@/components/DynamicForm";
import DynamicTable from "@/components/DynamicTable";
import { api, setAuthToken } from "@/lib/api";

type Field = {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
};

type EntityConfig = {
  name: string;
  label?: string;
  fields?: Field[];
};

export default function EntityPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const entityName = String(params?.entity || "");
  const configId = String(searchParams.get("configId") || "");

  const [config, setConfig] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setAuthToken(token);
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!configId || !entityName) return;

    try {
      const res = await api.get(`/apps/${configId}/entities/${entityName}`);
      setRecords(res.data?.records || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  }, [configId, entityName]);

  useEffect(() => {
    if (!configId || !entityName) return;

    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const configRes = await api.get(`/configs/${configId}`);
        const finalConfig =
          configRes.data?.normalized_config ||
          configRes.data?.config?.normalized_config ||
          configRes.data ||
          null;

        setConfig(finalConfig);
        await fetchRecords();
      } catch (err) {
        console.error(err);
        setError("Failed to load entity");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [configId, entityName, fetchRecords]);

  const entityConfig: EntityConfig | undefined = useMemo(() => {
    const entities = config?.entities || [];
    return entities.find((item: EntityConfig) => item.name === entityName);
  }, [config, entityName]);

  const handleCreate = async (formData: Record<string, any>) => {
    try {
      setError("");
      await api.post(`/apps/${configId}/entities/${entityName}`, formData);
      await fetchRecords();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to create record");
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      setImportMessage("Please select a CSV file.");
      return;
    }

    try {
      setImporting(true);
      setImportMessage("");

      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await api.post(
        `/apps/${configId}/entities/${entityName}/import`,
        formData
      );

      setImportMessage(
        `${res.data?.message || "CSV imported successfully"} | Imported: ${res.data?.count ?? 0} | Skipped: ${res.data?.skipped ?? 0}`
      );

      await fetchRecords();
      setCsvFile(null);
    } catch (err: any) {
      console.error(err);
      setImportMessage(err?.response?.data?.message || "Failed to import CSV");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-6 text-white">Loading...</div>;
  }

  if (!entityConfig) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        Entity config not found
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold">
            {entityConfig.label || entityName}
          </h1>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <DynamicForm
            key={`${configId}-${entityName}`}
            fields={entityConfig.fields || []}
            onSubmit={handleCreate}
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
            <h2 className="mb-3 text-lg font-semibold">Import CSV</h2>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="mb-3 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-white"
            />

            <button
              onClick={handleImportCsv}
              disabled={importing || !csvFile}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import CSV"}
            </button>

            {importMessage ? (
              <p className="mt-3 text-sm text-slate-300">{importMessage}</p>
            ) : null}
          </div>

          <h2 className="mb-4 text-xl font-bold">Records</h2>
          <DynamicTable fields={entityConfig.fields || []} records={records} />
        </section>
      </div>
    </main>
  );
}