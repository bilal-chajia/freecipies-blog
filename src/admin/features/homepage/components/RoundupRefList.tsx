import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import { mapArticleToRoundupRef, addRoundupRef } from '../utils/ref-mappers';
import type { HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

interface RefRowProps { ref: HomepageRoundupRef; onRemove: () => void; }

function RefRow({ ref: refItem, onRemove }: RefRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(refItem.roundup_id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-sm border border-border bg-muted/40">
      <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{refItem.title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{refItem.route}</p>
      </div>
      <button type="button" aria-label="Remove" className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface RoundupRefListProps {
  refs: HomepageRoundupRef[];
  onChange: (refs: HomepageRoundupRef[]) => void;
}

const RoundupRefList: React.FC<RoundupRefListProps> = ({ refs, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/articles', { params: { type: 'roundup', search: query, limit: 8 } });
      const data = res.data;
      setResults(Array.isArray(data) ? data : (data.data || []));
    } catch { setResults([]); }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleAdd = (item: ArticleApiItem) => {
    const next = addRoundupRef(refs, mapArticleToRoundupRef(item));
    if (next === refs) { toast('This roundup is already in the list'); return; }
    onChange(next);
    setSearchQuery('');
    setResults([]);
  };

  const handleRemove = (roundupId: number) => onChange(refs.filter((r) => r.roundup_id !== roundupId));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const ids = refs.map((r) => String(r.roundup_id));
      onChange(arrayMove(refs, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search roundups to add..." className="h-8 text-sm" />
        {searchQuery && (results.length > 0 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
            {isSearching ? <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div> : (
              results.map((item) => (
                <button key={item.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => handleAdd(item)}>
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={refs.map((r) => String(r.roundup_id))} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {refs.map((r) => <RefRow key={r.roundup_id} ref={r} onRemove={() => handleRemove(r.roundup_id)} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default RoundupRefList;
