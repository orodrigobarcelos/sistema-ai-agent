"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EvolutionSettings {
  url: string;
  api_key: string;
  instance_name: string;
}

export default function SettingsPage() {
  const [evolution, setEvolution] = useState<EvolutionSettings>({
    url: "",
    api_key: "",
    instance_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.evolution_api) {
        setEvolution(data.evolution_api);
      }
    } catch {
      // Sem configurações salvas ainda
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    if (!evolution.url || !evolution.api_key || !evolution.instance_name) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "evolution_api", value: evolution }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erro ao salvar.");
      }

      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!evolution.url || !evolution.api_key || !evolution.instance_name) {
      toast.error("Preencha todos os campos antes de testar.");
      return;
    }

    try {
      const res = await fetch("/api/settings/test-evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evolution),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Falha na conexão.");
        return;
      }

      toast.success(data.message || "Conexão bem-sucedida!");
    } catch {
      toast.error("Erro ao testar conexão.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie as integrações e configurações do sistema.
        </p>
      </div>

      <div className="rounded-md border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Evolution API</h3>
          <p className="text-sm text-muted-foreground">
            Configure a conexão com a Evolution API para envio e recebimento de
            mensagens via WhatsApp.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evolution-url">URL da Instância</Label>
            <Input
              id="evolution-url"
              placeholder="https://evolution.seudominio.com"
              value={evolution.url}
              onChange={(e) =>
                setEvolution({ ...evolution, url: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              URL base da sua instância da Evolution API (sem barra no final).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolution-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="evolution-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Sua API Key"
                value={evolution.api_key}
                onChange={(e) =>
                  setEvolution({ ...evolution, api_key: e.target.value })
                }
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="shrink-0"
              >
                {showApiKey ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolution-instance">Nome da Instância</Label>
            <Input
              id="evolution-instance"
              placeholder="minha-instancia"
              value={evolution.instance_name}
              onChange={(e) =>
                setEvolution({ ...evolution, instance_name: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Nome da instância do WhatsApp configurada na Evolution API.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={handleTestConnection}>
            Testar Conexão
          </Button>
        </div>
      </div>
    </div>
  );
}
