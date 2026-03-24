"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LeadDetails {
  name: string | null;
  phone_number: string | null;
  email: string | null;
  thumbnail: string | null;
  custom_attributes: Record<string, string | number | boolean | null>;
  labels: string[];
  conversation_url: string | null;
  summary: string | null;
}

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadPhone: string | null;
  leadName: string | null;
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  leadId,
  leadPhone,
  leadName,
}: LeadDetailDialogProps) {
  const [details, setDetails] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !leadPhone) return;

    setLoading(true);
    setError(null);
    setDetails(null);

    const params = new URLSearchParams({ phone: leadPhone });
    if (leadId) params.set("lead_id", leadId);

    fetch(`/api/chatwoot/contact-details?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Erro ao carregar detalhes (${res.status})`);
        }
        return res.json();
      })
      .then(setDetails)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, leadPhone, leadId]);

  const customAttrs = details?.custom_attributes || {};
  const attrEntries = Object.entries(customAttrs).filter(
    ([, v]) => v !== null && v !== "" && v !== undefined
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {details?.thumbnail && (
              <img
                src={details.thumbnail}
                alt={leadName || "Avatar"}
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            )}
            <DialogTitle>{leadName || details?.name || "Detalhes do Lead"}</DialogTitle>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {details && (
          <div className="flex flex-col gap-5">
            {/* Info basica */}
            <div className="rounded-md border divide-y text-sm">
              {details.phone_number && (
                <div className="grid grid-cols-[120px_1fr] px-3 py-2.5">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span className="font-mono">{details.phone_number}</span>
                </div>
              )}
              {details.email && (
                <div className="grid grid-cols-[120px_1fr] px-3 py-2.5">
                  <span className="text-muted-foreground">Email</span>
                  <span>{details.email}</span>
                </div>
              )}
            </div>

            {/* Etiquetas */}
            {details.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Etiquetas</h3>
                <div className="flex flex-wrap gap-1.5">
                  {details.labels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Atributos personalizados */}
            {attrEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Atributos personalizados</h3>
                <div className="rounded-md border divide-y text-sm">
                  {attrEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo da conversa */}
            {details.summary && (
              <div>
                <h3 className="text-sm font-medium mb-2">Resumo da conversa</h3>
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {details.summary}
                </div>
              </div>
            )}

            {/* Botao Chatwoot */}
            {details.conversation_url && (
              <Button asChild variant="outline" className="w-full">
                <a href={details.conversation_url} target="_blank" rel="noopener noreferrer">
                  Abrir conversa no Chatwoot
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
