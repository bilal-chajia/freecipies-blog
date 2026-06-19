import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';

interface AuthorApiItem { id: number; name: string; slug: string; }

export interface AuthorPickerProps {
  value: number | null | undefined;
  selectedLabel?: string | null;
  onChange: (authorId: number | null, label?: string) => void;
}

const AuthorPicker: React.FC<AuthorPickerProps> = ({ value, selectedLabel, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AuthorApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/authors', { params: { workflow_status: 'published' } });
      const data = res.data;
      const all: AuthorApiItem[] = Array.isArray(data) ? data : (data.data || []);
      setResults(all.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    } catch {
      toast.error('Author search failed');
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{selectedLabel || `Author #${value}`}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onChange(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search authors..."
            className="h-8 text-sm"
          />
          {showDropdown && (results.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
              ) : (
                results.map((a) => (
                  <button key={a.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => { onChange(a.id, a.name); setShowDropdown(false); setSearchQuery(''); }}>
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.slug}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthorPicker;
