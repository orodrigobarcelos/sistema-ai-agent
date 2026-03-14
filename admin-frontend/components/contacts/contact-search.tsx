"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag } from "@/lib/types";

interface ContactSearchProps {
  onSearchChange: (search: string) => void;
  onTagChange: (tag: string) => void;
  selectedTag: string;
}

export function ContactSearch({ onSearchChange, onTagChange, selectedTag }: ContactSearchProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  function handleSearchInput(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <Input
          value={searchValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Buscar por nome, telefone ou Instagram..."
          className="pl-9"
        />
      </div>

      <Select value={selectedTag} onValueChange={onTagChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag.id} value={tag.name}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
