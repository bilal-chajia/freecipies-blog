import { useState, useRef, useEffect } from 'react';
import { Label } from '@/ui/label';
import { Button } from '@/ui/button';
import { Switch } from '@/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import ColorPicker from '@/components/ColorPicker';
import BrandingCards from '@/components/BrandingCards';
import { brandingAPI } from '../../../../services/api';
import { Palette, Image, ListTree, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface AppearanceSettingsProps {
  formData: Record<string, unknown>;
  handleInputChange: (field: string, value: unknown) => void;
  activeSection?: string;
  setHeaderActions?: React.Dispatch<React.SetStateAction<React.ReactNode>>;
}

const AppearanceSettings = ({ formData, handleInputChange }: AppearanceSettingsProps) => {
  const [activeSection, setActiveSection] = useState('branding');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTocColorPicker, setShowTocColorPicker] = useState(false);
  const [logos, setLogos] = useState<Record<string, string | null>>({
    logoMain: null,
    logoDark: null,
    logoMobile: null,
  });
  const [favicon, setFavicon] = useState<string | null>(null);
  const [faviconVariants, setFaviconVariants] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);
  const tocColorTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await brandingAPI.getAll();
        if (response.data?.success && response.data?.data) {
          setLogos({
            logoMain: response.data.data.logoMain,
            logoDark: response.data.data.logoDark,
            logoMobile: response.data.data.logoMobile,
          });
          setFavicon(response.data.data.favicon);
          setFaviconVariants(response.data.data.faviconVariants || {});
        }
      } catch (error) {
        toast.error('Failed to load branding');
      } finally {
        setLoading(false);
      }
    };
    loadBranding();
  }, []);

  const handleColorChange = (color: string) => {
    handleInputChange('badgeColor', color);
    setShowColorPicker(false);
  };

  const handleTocColorChange = (color: string) => {
    handleInputChange('tocAccentColor', color);
    setShowTocColorPicker(false);
  };

  const handleLogoChange = (type: string, url: string | null) => {
    const keyMap: Record<string, string> = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
    setLogos(prev => ({ ...prev, [keyMap[type]]: url }));
  };

  const handleLogoDelete = (type: string) => {
    const keyMap: Record<string, string> = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
    setLogos(prev => ({ ...prev, [keyMap[type]]: null }));
  };

  const handleFaviconChange = (url: string | null) => setFavicon(url);
  const handleFaviconDelete = () => {
    setFavicon(null);
    setFaviconVariants({});
  };

  const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;
  const getTocTriggerRect = () => tocColorTriggerRef.current?.getBoundingClientRect() || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading assets...
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
      <TabsList className="h-8 p-1 bg-muted/50 rounded-lg">
        <TabsTrigger value="branding" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Image className="size-3.5 mr-1.5" />
          Branding
        </TabsTrigger>
        <TabsTrigger value="colors" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Palette className="size-3.5 mr-1.5" />
          Colors
        </TabsTrigger>
        <TabsTrigger value="toc" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <ListTree className="size-3.5 mr-1.5" />
          Table of Contents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="branding" className="mt-0">
        <BrandingCards
          logos={logos}
          favicon={favicon ?? undefined}
          onLogoChange={handleLogoChange}
          onLogoDelete={handleLogoDelete}
          onFaviconChange={handleFaviconChange}
          onFaviconDelete={handleFaviconDelete}
        />
      </TabsContent>

      <TabsContent value="colors" className="mt-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Accent Color</Label>
          <p className="text-[11px] text-muted-foreground">
            Applied to badges, category tags, and highlight components.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              ref={colorTriggerRef}
              variant="outline"
              className="w-10 h-10 p-1"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <div
                className="w-full h-full rounded"
                style={{ backgroundColor: (formData.badgeColor as string) || 'var(--info)' }}
              />
            </Button>
            <div className="font-mono text-xs text-muted-foreground">
              {(formData.badgeColor as string) || '#3b82f6'}
            </div>

            {showColorPicker && (
              <ColorPicker
                color={(formData.badgeColor as string) || '#3b82f6'}
                onChange={(color: string | null) => handleColorChange(color ?? '')}
                onClose={() => setShowColorPicker(false)}
                triggerRect={getTriggerRect()}
              />
            )}
          </div>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
          <span className="text-[10px] font-medium text-muted-foreground">Preview</span>
          <div className="flex gap-2 mt-2">
            <div
              className="px-3 py-1 rounded-full text-white text-xs font-medium"
              style={{ backgroundColor: (formData.badgeColor as string) || 'var(--info)' }}
            >
              Featured
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: (formData.badgeColor as string) || 'var(--info)', color: (formData.badgeColor as string) || 'var(--info)' }}
            >
              Category
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2.5 bg-warning/10 rounded-md text-xs text-warning dark:text-warning">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          Ensure contrast for accessibility on both light and dark backgrounds.
        </div>
      </TabsContent>

      {/* Table of Contents Settings */}
      <TabsContent value="toc" className="mt-0 space-y-4">
        <div className="space-y-4">
          {/* Enable TOC */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show Table of Contents</Label>
              <p className="text-[11px] text-muted-foreground">
                Display TOC box on recipe pages
              </p>
            </div>
            <Switch
              checked={(formData.tocEnabled as boolean) ?? true}
              onCheckedChange={(checked) => handleInputChange('tocEnabled', checked)}
            />
          </div>

          {/* Numbering */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Numbered Sections</Label>
              <p className="text-[11px] text-muted-foreground">
                Show hierarchical numbers (1, 1.1, 1.2, 2, etc.)
              </p>
            </div>
            <Switch
              checked={(formData.tocNumbering as boolean) ?? true}
              onCheckedChange={(checked) => handleInputChange('tocNumbering', checked)}
            />
          </div>

          {/* Collapsible */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Collapsible TOC</Label>
              <p className="text-[11px] text-muted-foreground">
                Allow users to expand/collapse the TOC
              </p>
            </div>
            <Switch
              checked={(formData.tocCollapsible as boolean) ?? true}
              onCheckedChange={(checked) => handleInputChange('tocCollapsible', checked)}
            />
          </div>

          {/* Default Open */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Open by Default</Label>
              <p className="text-[11px] text-muted-foreground">
                TOC starts expanded when page loads
              </p>
            </div>
            <Switch
              checked={(formData.tocDefaultOpen as boolean) ?? true}
              onCheckedChange={(checked) => handleInputChange('tocDefaultOpen', checked)}
            />
          </div>

          {/* Heading Depth Selection */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Heading Depth</Label>
              <p className="text-[11px] text-muted-foreground">
                Limit which sub-headings appear in the TOC
              </p>
            </div>
            <Select
              value={String((formData.tocMaxDepth as number) ?? 4)}
              onValueChange={(val) => handleInputChange('tocMaxDepth', parseInt(val))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">H2 Only (Top level)</SelectItem>
                <SelectItem value="3">Up to H3</SelectItem>
                <SelectItem value="4">Up to H4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jump to Recipe Button */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Jump to Recipe Button</Label>
              <p className="text-[11px] text-muted-foreground">
                Show the orange "Jump to Recipe" button
              </p>
            </div>
            <Switch
              checked={(formData.tocShowJumpButton as boolean) ?? true}
              onCheckedChange={(checked) => handleInputChange('tocShowJumpButton', checked)}
            />
          </div>

          {/* TOC Accent Color */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/40">
            <Label className="text-sm font-medium">TOC Accent Color</Label>
            <p className="text-[11px] text-muted-foreground">
              Color for numbers, borders, and buttons in the TOC
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Button
                ref={tocColorTriggerRef}
                variant="outline"
                className="w-10 h-10 p-1"
                onClick={() => setShowTocColorPicker(!showTocColorPicker)}
              >
                <div
                  className="w-full h-full rounded"
                  style={{ backgroundColor: (formData.tocAccentColor as string) || 'var(--brand-accent)' }}
                />
              </Button>
              <div className="font-mono text-xs text-muted-foreground">
                {(formData.tocAccentColor as string) || '#f97316'}
              </div>

              {showTocColorPicker && (
                <ColorPicker
                  color={(formData.tocAccentColor as string) || '#f97316'}
                  onChange={(color: string | null) => handleTocColorChange(color ?? '')}
                  onClose={() => setShowTocColorPicker(false)}
                  triggerRect={getTocTriggerRect()}
                />
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg border-2 bg-secondary/10 border-secondary/20">
            <span className="text-[10px] font-medium text-secondary-foreground">TOC Preview</span>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-sm" style={{ color: (formData.tocAccentColor as string) || 'var(--brand-accent)' }}>
                <span className="font-bold">1.</span>
                <span className="text-secondary-foreground">Introduction</span>
              </div>
              <div className="flex items-center gap-2 text-sm pl-4" style={{ color: (formData.tocAccentColor as string) || 'var(--brand-accent)' }}>
                <span className="font-bold">1.1.</span>
                <span className="text-secondary-foreground">Background</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: (formData.tocAccentColor as string) || 'var(--brand-accent)' }}>
                <span className="font-bold">2.</span>
                <span className="text-secondary-foreground">Ingredients</span>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default AppearanceSettings;
