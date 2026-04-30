"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, setAuthToken } from "@/lib/api";

type Entity = {
  name: string;
  label?: string;
};

type SavedConfigResponse = {
  id?: string;
  message?: string;
  warnings?: string[];
  config?: {
    id?: string;
    normalized_config?: {
      entities?: Entity[];
    };
  };
  normalizedConfig?: {
    entities?: Entity[];
  };
};

export default function DashboardPage() {
  const [configText, setConfigText] = useState(`{
  "appName": "CRM Demo",
  "auth": { "enabled": true, "providers": ["email"] },
  "locales": ["en", "hi"],
  "defaultLocale": "en",
  "entities": [
    {
      "name": "leads",
      "label": "Leads",
      "fields": [
        { "name": "fullName", "type": "text", "label": "Full Name", "required": true },
        { "name": "email", "type": "email", "label": "Email" },
        { "name": "status", "type": "select", "label": "Status", "options": ["new", "contacted", "qualified"] },
        { "name": "city", "type": "text", "label": "City" }
      ]
    }
  ]
}`);

  const [savedConfig, setSavedConfig] = useState<SavedConfigResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
    }
  }, []);

  async function handleSaveConfig() {
    try {
      setLoading(true);
      setError("");

      const parsed = JSON.parse(configText);
      const res = await api.post("/configs", parsed);

      console.log("SAVE CONFIG SUCCESS:", res.data);
      setSavedConfig(res.data);
    } catch (err: unknown) {
      console.error("SAVE CONFIG ERROR:", err);

      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err 
      ) {
        const axiosErr = err as { 
            response: { 
                status: number; 
                data: {
                    message?: string;
                    error?: string;
        };
     };
    };

        console.error("RESPONSE STATUS:", axiosErr.response.status);
        console.error("RESPONSE DATA:", axiosErr.response.data);

        setError(
          axiosErr.response.data?.message ||
            axiosErr.response.data?.error ||
            `Request failed with status ${axiosErr.response.status}`
        );
      } else if (
        typeof err === "object" &&
        err !== null &&
        "request" in err
      ) {
        setError("No response from backend. Check backend server or CORS.");
      } else if (err instanceof SyntaxError) {
        setError("Invalid JSON format.");
      } else if (err instanceof Error) {
        setError(err?.message || "Failed to save config");
      }
    } finally {
      setLoading(false);
    }
  }

  const configId = savedConfig?.config?.id || savedConfig?.id || "";
  const entities =
    savedConfig?.normalizedConfig?.entities ||
    savedConfig?.config?.normalized_config?.entities ||
    [];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold">Save Config</h1>

          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            className="min-h-[420px] w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-white outline-none"
          />

          {error ? (
            <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Config"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">Entities</h2>

          {!configId ? (
            <p className="text-slate-400">Save config first.</p>
          ) : (
            <div className="space-y-3">
              {entities.map((entity) => (
                <Link
                  key={entity.name}
                  href={`/dashboard/${entity.name}?configId=${configId}`}
                  className="block rounded-xl bg-slate-800 p-4 transition hover:bg-slate-700"
                >
                  <p className="font-medium">{entity.label || entity.name}</p>
                  <p className="text-sm text-slate-400">{entity.name}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}