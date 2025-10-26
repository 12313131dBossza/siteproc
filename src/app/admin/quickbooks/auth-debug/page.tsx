'use client';

import { useEffect, useState } from 'react';

type DebugResp = {
  ok: boolean;
  url?: string;
  params?: Record<string, string>;
  env?: { clientId?: string; redirectUri?: string; environment?: string; authEndpoint?: string };
  error?: string;
};

export default function QBAuthDebugPage() {
  const [data, setData] = useState<DebugResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/quickbooks/authorize/debug');
        if (!res.ok) throw new Error('Failed to load auth debug');
        const json = (await res.json()) as DebugResp;
        setData(json);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">QuickBooks Auth Debug</h1>
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">{err}</div>
        )}
        {data && (
          <>
            <div className="bg-white border rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Authorization URL</h2>
                {data.url && (
                  <button
                    onClick={() => copy(data.url!)}
                    className="text-sm px-3 py-1 bg-gray-800 text-white rounded"
                  >
                    Copy
                  </button>
                )}
              </div>
              {data.url ? (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 break-all underline"
                >
                  {data.url}
                </a>
              ) : (
                <p className="text-gray-600">No URL</p>
              )}
            </div>

            <div className="bg-white border rounded p-4">
              <h2 className="font-semibold mb-2">Resolved Params</h2>
              <div className="text-sm grid grid-cols-1 gap-2">
                {data.params &&
                  Object.entries(data.params).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3">
                      <div className="w-40 text-gray-600">{k}</div>
                      <div className="font-mono break-all">{v}</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white border rounded p-4">
              <h2 className="font-semibold mb-2">Env Snapshot</h2>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(data.env, null, 2)}</pre>
            </div>

            <a href="/admin/quickbooks/diagnose" className="inline-block px-4 py-2 bg-gray-700 text-white rounded">
              ← Back to Diagnostics
            </a>
          </>
        )}
      </div>
    </div>
  );
}
