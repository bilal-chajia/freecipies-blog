import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import type { HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

export interface RoundupPickerProps {
  value: HomepageRoundupRef | null | undefined;
  onChange: (value: HomepageRoundupRef | null) => void;
}

const RoundupPicker: React.FC<RoundupPickerProps> = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/articles', { params: { type: 'roundup', search: query, limit: 8 } });
      const data = res.data;
      const items: ArticleApiItem[] = Array.isArray(data) ? data : (data.data || []);
      setResults(items);
    } catch {
      toast.error('Roundup search failed');
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleSelect = (item: ArticleApiItem) => {
    onChange({ roundup_id: Number(item.id), title: item.title, route: `/roundups/${item.slug}` });
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{value.title}</p>
            <p className="text-xs text-muted-foreground font-mono">{value.route}</p>
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
            placeholder="Search roundups..."
            className="h-8 text-sm"
          />
          {showDropdown && (results.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">No results</div>
              ) : (
                results.map((item) => (
                  <button key={item.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3" onClick={() => handleSelect(item)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                    </div>
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

export default RoundupPicker;
