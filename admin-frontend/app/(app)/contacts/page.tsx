"use client";

import { useState, useCallback } from "react";

interface Progress {
  phase: string;
  current: number;
  total: number;
  totalContacts?: number;
  message?: string;
}

export default function ContactsPage() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startExport = useCallback(async () => {
    setExporting(true);
    setProgress(null);
    setError(null);

    try {
      const res = await fetch("/api/contacts/export");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao exportar");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream não disponível");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.phase === "complete") {
            // Trigger CSV download
            const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `contatos-chatwoot-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setProgress({ phase: "done", current: 0, total: 0 });
          } else if (data.phase === "error") {
            throw new Error(data.message);
          } else {
            setProgress(data);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, []);

  const getProgressLabel = () => {
    if (!progress) return "";
    switch (progress.phase) {
      case "contacts":
        return `Buscando contatos... ${progress.current}/${progress.total} páginas (${progress.totalContacts} contatos)`;
      case "labels":
        return `Buscando etiquetas... ${progress.current}/${progress.total} contatos`;
      case "kanban":
        return "Buscando posições do Kanban...";
      case "generating":
        return "Gerando arquivo CSV...";
      case "done":
        return "Download concluído!";
      default:
        return "";
    }
  };

  const getProgressPercent = () => {
    if (!progress || !progress.total) return 0;
    if (progress.phase === "done") return 100;
    if (progress.phase === "generating") return 98;
    if (progress.phase === "kanban") return 95;

    // contacts: 0-25%, labels: 25-95%
    const phaseWeight = progress.phase === "contacts" ? 0.25 : 0.7;
    const phaseBase = progress.phase === "contacts" ? 0 : 25;
    return Math.round(phaseBase + (progress.current / progress.total) * 100 * phaseWeight);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Download Contatos</h1>
      <p className="text-muted-foreground mt-1">
        Exporte seus contatos do Chatwoot com atributos personalizados e etiquetas.
      </p>

      <div className="mt-8 max-w-xl">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Exportar para CSV</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Todos os contatos serão exportados com seus atributos personalizados e etiquetas de conversa.
          </p>

          {!exporting && progress?.phase !== "done" && (
            <button
              onClick={startExport}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar Contatos
            </button>
          )}

          {exporting && progress && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <span className="text-sm">{getProgressLabel()}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{getProgressPercent()}%</span>
            </div>
          )}

          {progress?.phase === "done" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-green-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-sm font-medium">Download concluído!</span>
              </div>
              <button
                onClick={startExport}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Exportar novamente
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
