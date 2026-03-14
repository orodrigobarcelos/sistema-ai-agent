"use client";

import { useEffect, useState } from "react";
import { ContactDetail, ContactListItem, Tag, TictoOrder } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ContactDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactListItem | null;
  onContactUpdated?: () => void;
}

function formatPhone(whatsapp: string) {
  const phone = whatsapp.replace(/^\+55/, "");
  if (phone.length === 11) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  }
  return whatsapp;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `há ${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `há ${diffMonths} ${diffMonths === 1 ? "mês" : "meses"}`;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprovado", color: "#10B981" },
  authorized: { label: "Autorizado", color: "#3B82F6" },
  pix_created: { label: "PIX Gerado", color: "#8B5CF6" },
  abandoned_cart: { label: "Carrinho Abandonado", color: "#F59E0B" },
  refused: { label: "Recusado", color: "#EF4444" },
  refunded: { label: "Reembolsado", color: "#EF4444" },
  chargeback: { label: "Chargeback", color: "#DC2626" },
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function OrderCard({ order }: { order: TictoOrder }) {
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "#6B7280" };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{order.product_name || "Produto"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 border"
            style={{
              backgroundColor: `${statusInfo.color}20`,
              color: statusInfo.color,
              borderColor: `${statusInfo.color}40`,
            }}
          >
            {statusInfo.label}
          </Badge>
          {order.offer_name && (
            <span className="text-[10px] text-muted-foreground truncate">{order.offer_name}</span>
          )}
        </div>
      </div>
      <div className="text-right ml-3 shrink-0">
        {order.paid_amount && (
          <p className="text-sm font-medium">
            R$ {(order.paid_amount / 100).toFixed(2)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {order.status_date
            ? new Date(order.status_date).toLocaleDateString("pt-BR")
            : new Date(order.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h4>
          {count !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {count}
            </Badge>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function ContactDetailDialog({
  open,
  onOpenChange,
  contact,
  onContactUpdated,
}: ContactDetailDialogProps) {
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    if (!open || !contact) {
      setDetail(null);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/contacts/${contact.id}`).then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ])
      .then(([contactData, tagsData]) => {
        setDetail(contactData);
        setAllTags(tagsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, contact]);

  async function handleAddTag(tagId: string) {
    if (!detail || tagId === "placeholder") return;
    setAddingTag(true);

    try {
      const res = await fetch(`/api/contacts/${detail.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id: tagId }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error || "Erro ao adicionar tag.");
        return;
      }

      const newTag = await res.json();
      setDetail({ ...detail, tags: [...detail.tags, newTag] });
      onContactUpdated?.();
      toast.success("Tag adicionada!");
    } catch {
      toast.error("Erro ao adicionar tag.");
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    if (!detail) return;

    try {
      const res = await fetch(`/api/contacts/${detail.id}/tags?tag_id=${tagId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("Erro ao remover tag.");
        return;
      }

      setDetail({ ...detail, tags: detail.tags.filter((t) => t.id !== tagId) });
      onContactUpdated?.();
      toast.success("Tag removida!");
    } catch {
      toast.error("Erro ao remover tag.");
    }
  }

  const whatsappLink = contact
    ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`
    : "";

  const availableTags = allTags.filter(
    (t) => !detail?.tags.some((dt) => dt.id === t.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Contato</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Header com avatar */}
            <div className="flex items-center gap-4">
              {detail.profile_pic_url ? (
                <img
                  src={detail.profile_pic_url}
                  alt={detail.name}
                  className="h-14 w-14 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground shrink-0">
                  {getInitials(detail.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate">{detail.name}</h3>
                {detail.ig_username && (
                  <p className="text-sm text-muted-foreground">@{detail.ig_username}</p>
                )}
              </div>
            </div>

            {/* Informacoes basicas */}
            <div className="rounded-md border p-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Contato
              </h4>
              <InfoRow label="Telefone" value={formatPhone(detail.whatsapp)} />
              <InfoRow label="Instagram" value={detail.ig_username ? `@${detail.ig_username}` : null} />
              <InfoRow label="Inscrito em" value={new Date(detail.created_at).toLocaleString("pt-BR")} />
              <InfoRow
                label="Última interação"
                value={detail.last_interaction ? timeAgo(detail.last_interaction) : null}
              />
              {detail.kanban_position && (
                <InfoRow
                  label="Pipeline"
                  value={`${detail.kanban_position.board_name} / ${detail.kanban_position.column_name}`}
                />
              )}
            </div>

            {/* Tags — editavel */}
            <CollapsibleSection title="Tags" count={detail.tags.length} defaultOpen={true}>
              <div className="space-y-2">
                {detail.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs px-2 py-0.5 border gap-1"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color || undefined,
                          borderColor: `${tag.color}40`,
                        }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="ml-0.5 hover:opacity-70"
                          onClick={() => handleRemoveTag(tag.id)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma tag atribuída.</p>
                )}

                {availableTags.length > 0 && (
                  <Select
                    value="placeholder"
                    onValueChange={handleAddTag}
                    disabled={addingTag}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="+ Adicionar tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Selecione uma tag
                      </SelectItem>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CollapsibleSection>

            {/* Resumo da conversa */}
            {detail.conversation_summary && (
              <CollapsibleSection title="Resumo da Conversa" defaultOpen={true}>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {detail.conversation_summary}
                </p>
              </CollapsibleSection>
            )}

            {/* Pedidos Ticto */}
            <CollapsibleSection title="Pedidos" count={detail.orders.length}>
              {detail.orders.length > 0 ? (
                <div>
                  {detail.orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-1">Sem pedidos.</p>
              )}
            </CollapsibleSection>

            {/* Instagram */}
            {(detail.ig_full_name || detail.ig_bio || detail.ig_followers) && (
              <CollapsibleSection title="Instagram">
                <InfoRow label="Nome" value={detail.ig_full_name} />
                <InfoRow label="Seguidores" value={detail.ig_followers?.toLocaleString("pt-BR")} />
                {detail.ig_bio && (
                  <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                    {detail.ig_bio}
                  </p>
                )}
              </CollapsibleSection>
            )}

            {/* Campos personalizados */}
            {detail.custom_fields.length > 0 && (
              <CollapsibleSection title="Campos Personalizados" count={detail.custom_fields.length}>
                {detail.custom_fields.map((cf, i) => (
                  <InfoRow key={i} label={cf.name} value={cf.value} />
                ))}
              </CollapsibleSection>
            )}

            {/* UTMs */}
            {(detail.utm_source || detail.utm_campaign || detail.utm_medium) && (
              <CollapsibleSection title="Origem (UTM)">
                <InfoRow label="Source" value={detail.utm_source} />
                <InfoRow label="Campaign" value={detail.utm_campaign} />
                <InfoRow label="Medium" value={detail.utm_medium} />
                <InfoRow label="Content" value={detail.utm_content} />
                <InfoRow label="Term" value={detail.utm_term} />
              </CollapsibleSection>
            )}

            {/* Botao WhatsApp */}
            <Button className="w-full" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                Abrir WhatsApp
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
