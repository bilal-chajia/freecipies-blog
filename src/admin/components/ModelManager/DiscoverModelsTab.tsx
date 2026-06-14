import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { ScrollArea } from '@/ui/scroll-area';
import { DialogFooter } from '@/ui/dialog';
import { aiAPI } from '@/services/api';
import type { ManagedModel } from '../ModelManager';
import { filterModels, toModelSelection, type DiscoverRow } from './discover-filter';

type DiscoverModelsTabProps = {
  provider: string;
  isCustom: boolean;
  existingModels: ManagedModel[];
  onAdded: () => void | Promise<void>;
  onClose: () => void;
};

export function DiscoverModelsTab({ provider, isCustom, existingModels, onAdded, onClose }: DiscoverModelsTabProps) {
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [rows, setRows] = useState<DiscoverRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.discoverModels(provider);
      const data = response.data.data as { supported: boolean; models: DiscoverRow[] };
      setSupported(data.supported);
      setRows(data.models ?? []);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const existingIds = useMemo(() => new Set(existingModels.map((m) => m.id)), [existingModels]);
  const filtered = useMemo(() => filterModels(rows, query), [rows, query]);
  const selectableChecked = rows.filter((m) => checked.has(m.id) && !m.selected && !existingIds.has(m.id)).length;

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const toAdd = rows.filter((m) => checked.has(m.id) && !m.selected && !existingIds.has(m.id));
    if (toAdd.length === 0) return;
    setSaving(true);
    try {
      const mapped = toAdd.map((m, i) => toModelSelection(m, existingModels.length + i));
      const models = [...existingModels, ...mapped];
      const patch = isCustom
        ? { custom_providers: { [provider]: { models } } }
        : { providers: { [provider]: { models } } };
      const response = await aiAPI.updateSettings(patch);
      if (response.status >= 200 && response.status < 300) {
        toast.success(`Added ${toAdd.length} model${toAdd.length > 1 ? 's' : ''}`);
        await onAdded();
        onClose();
      }
    } catch {
      toast.error('Failed to add selected models');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchModels}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!supported || rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Discovery is unavailable for this provider. Use the Manual tab or Bulk Import.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchModels} className="h-8" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-64 rounded-md border">
        <div className="divide-y">
          {filtered.map((m) => {
            const already = m.selected || existingIds.has(m.id);
            return (
              <label key={m.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                <Checkbox
                  checked={already || checked.has(m.id)}
                  disabled={already}
                  onCheckedChange={() => toggle(m.id)}
                />
                <span className="flex-1 truncate">{m.name || m.id}</span>
                {already && <Badge variant="outline" className="text-xs px-1 py-0">Already added</Badge>}
                {m.status === 'deprecated' && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">Deprecated</Badge>
                )}
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">No models match your search.</p>
          )}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={selectableChecked === 0 || saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Add selected{selectableChecked > 0 ? ` (${selectableChecked})` : ''}
        </Button>
      </DialogFooter>
    </div>
  );
}
