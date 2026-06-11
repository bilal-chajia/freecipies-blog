import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Star, Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { toast } from 'sonner';
import { articlesAPI } from '../../../services/api';
import { unwrapApiData, type ArticleRecord, type CategoryFormData, type FormChangeHandler } from './types';

interface FeaturedHeroCardProps {
  formData: CategoryFormData;
  /** Resolved article for the currently selected featuredArticleId (from load). */
  selectedArticle: ArticleRecord | null;
  selectedLoading: boolean;
  selectedError: string;
  onSelect: (article: ArticleRecord) => void;
  onClear: () => void;
  onChange: FormChangeHandler;
}

const FeaturedHeroCard = ({
  formData,
  selectedArticle,
  selectedLoading,
  selectedError,
  onSelect,
  onClear,
  onChange,
}: FeaturedHeroCardProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArticleRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Debounced recipe search (only while nothing is selected).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError('');
      return;
    }

    let isActive = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await articlesAPI.getAll({
          search: trimmed,
          type: 'recipe',
          status: 'all',
          limit: 8,
        });
        const data = unwrapApiData<unknown>(response, []);
        if (isActive) {
          setResults(Array.isArray(data) ? (data as ArticleRecord[]) : []);
        }
      } catch {
        toast.error('Failed to search recipes');
        if (isActive) {
          setResults([]);
          setSearchError('Search failed');
        }
      } finally {
        if (isActive) setSearching(false);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const handlePick = (article: ArticleRecord) => {
    onSelect(article);
    setResults([]);
    setQuery('');
  };

  const articleTitle = (a: ArticleRecord) => a.headline || a.label || a.title || a.slug || '';

  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/50">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-md">
            <Star className="size-4 text-amber-500" />
          </div>
          <CardTitle className="text-base">Featured Recipe & Hero</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Featured Recipe</Label>
          {selectedLoading ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading featured recipe…
            </div>
          ) : selectedArticle ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{articleTitle(selectedArticle)}</p>
                {selectedArticle.slug && (
                  <p className="text-xs text-muted-foreground font-mono truncate">/{selectedArticle.slug}</p>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onClear}>
                <X className="size-4 mr-1" />
                Clear
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  placeholder="Search a recipe by title…"
                  className="h-9 pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {searchError && <p className="text-xs text-destructive">{searchError}</p>}
              {selectedError && <p className="text-xs text-destructive">{selectedError}</p>}
              {results.length > 0 && (
                <ul className="rounded-md border divide-y divide-border/60 max-h-56 overflow-auto">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted"
                        onClick={() => handlePick(r)}
                      >
                        <span className="block text-sm">{articleTitle(r)}</span>
                        {r.slug && (
                          <span className="block text-xs text-muted-foreground font-mono">/{r.slug}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Shown in the category hero. Leave empty to feature the latest recipe automatically.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Hero CTA</p>
            <p className="text-xs text-muted-foreground">Show a call-to-action in the hero</p>
          </div>
          <Switch
            checked={formData.showHeroCta}
            onCheckedChange={(checked: boolean) => onChange('showHeroCta', checked)}
          />
        </div>

        {formData.showHeroCta && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">CTA text</Label>
              <Input
                value={formData.heroCtaText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('heroCtaText', e.target.value)}
                placeholder="Join my mailing list"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">CTA link</Label>
              <Input
                value={formData.heroCtaLink}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('heroCtaLink', e.target.value)}
                placeholder="#newsletter"
                className="h-9"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedHeroCard;
