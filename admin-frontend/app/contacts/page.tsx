"use client";

import { useCallback, useEffect, useState } from "react";
import { ContactListItem } from "@/lib/types";
import { ContactSearch } from "@/components/contacts/contact-search";
import { ContactList, ContactPagination } from "@/components/contacts/contact-list";
import { ContactDetailDialog } from "@/components/contacts/contact-detail-dialog";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const perPage = 20;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactListItem | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (search) params.set("search", search);
      if (tagFilter && tagFilter !== "all") params.set("tag", tagFilter);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);

      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContacts(data.contacts);
      setTotal(data.total);
    } catch {
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, tagFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTagChange(value: string) {
    setTagFilter(value);
    setPage(1);
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function handleSelectContact(contact: ContactListItem) {
    setSelectedContact(contact);
    setDetailOpen(true);
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contatos</h2>
          <p className="text-muted-foreground">
            {total} {total === 1 ? "lead cadastrado" : "leads cadastrados"} no sistema.
          </p>
        </div>
      </div>

      <ContactSearch
        onSearchChange={handleSearchChange}
        onTagChange={handleTagChange}
        selectedTag={tagFilter}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          <ContactList
            contacts={contacts}
            onSelect={handleSelectContact}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <ContactPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <ContactDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        contact={selectedContact}
        onContactUpdated={fetchContacts}
      />
    </div>
  );
}
