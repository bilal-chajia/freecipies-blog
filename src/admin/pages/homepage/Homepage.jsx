import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, Home, Image, FileText, Star, Eye, Plus, X, Grid,
  GripVertical, Settings2, Layout, LayoutPanelLeft, 
  Newspaper, Mail, AppWindow, Search, MessageSquare,
  Sparkles, Check, RefreshCw
} from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Badge } from '@/ui/badge.jsx';
import { useHomepageStore } from '../../store/useStore';
import ColorPicker from '../../components/ColorPicker';
import { toast } from 'sonner';

const Homepage = () => {
  const { homepage, loading, error, setHomepage } = useHomepageStore();
  const [saving, setSaving] = useState(false);
  const [showHeroColorPicker, setShowHeroColorPicker] = useState(false);
  const heroColorTriggerRef = useRef(null);

  const [formData, setFormData] = useState({
    // Hero Section
    hero: {
      enabled: true,
      title: 'Welcome to Our Blog',
      subtitle: 'Discover amazing recipes and cooking tips',
      backgroundImage: '',
      backgroundColor: '#f8fafc',
      ctaText: 'Explore Recipes',
      ctaLink: '/articles?type=recipe',
      showSearch: true,
    },

    // Featured Posts Section
    featuredPosts: {
      enabled: true,
      title: 'Featured Articles',
      subtitle: 'Handpicked content for you',
      displayType: 'grid', // 'grid', 'list', 'carousel'
      maxPosts: 6,
      categoryFilter: 'all',
      tagFilter: 'all',
      sortBy: 'published_at', // 'published_at', 'views', 'favorites'
      sortOrder: 'desc',
    },

    // Categories Section
    categories: {
      enabled: true,
      title: 'Browse by Category',
      subtitle: 'Find what interests you most',
      displayType: 'grid', // 'grid', 'list'
      maxCategories: 8,
      showPostCount: true,
      showDescription: false,
    },

    // Latest Posts Section
    latestPosts: {
      enabled: true,
      title: 'Latest Posts',
      subtitle: 'Stay updated with our newest content',
      maxPosts: 12,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showViews: false,
    },

    // Popular Posts Section
    popularPosts: {
      enabled: true,
      title: 'Most Popular',
      subtitle: 'What everyone is reading',
      maxPosts: 6,
      timeRange: '30d', // '7d', '30d', '90d', 'all'
      showViews: true,
      showExcerpt: false,
    },

    // Newsletter Section
    newsletter: {
      enabled: true,
      title: 'Stay Updated',
      subtitle: 'Get the latest recipes and tips delivered to your inbox',
      description: 'Subscribe to our newsletter for weekly recipes, cooking tips, and exclusive content.',
      buttonText: 'Subscribe Now',
      placeholderText: 'Enter your email address',
      successMessage: 'Thank you for subscribing!',
      privacyText: 'We respect your privacy. Unsubscribe at any time.',
    },

    // Banners Section
    banners: {
      enabled: false,
      banner1: {
        enabled: false,
        title: '',
        description: '',
        image: '',
        link: '',
        buttonText: 'Learn More',
        position: 'top', // 'top', 'middle', 'bottom'
        size: 'large', // 'small', 'medium', 'large'
      },
      banner2: {
        enabled: false,
        title: '',
        description: '',
        image: '',
        link: '',
        buttonText: 'Learn More',
        position: 'middle',
        size: 'medium',
      },
    },

    // Social Proof Section
    socialProof: {
      enabled: false,
      title: 'Join Our Community',
      subtitle: 'Trusted by thousands of home cooks',
      stats: [
        { label: 'Recipes', value: '500+', icon: 'chef-hat' },
        { label: 'Happy Readers', value: '10K+', icon: 'users' },
        { label: 'Countries', value: '50+', icon: 'globe' },
      ],
    },

    // Custom Sections
    customSections: [],

    // SEO Settings
    seo: {
      metaTitle: 'Homepage - Delicious Recipes & Cooking Tips',
      metaDescription: 'Discover amazing recipes, cooking techniques, and kitchen tips from professional chefs and home cooks.',
      canonicalUrl: '',
      ogImage: '',
    },
  });

  // Load homepage settings on mount
  useEffect(() => {
    // Mock loading homepage settings - in real app this would come from API
    const mockHomepage = {
      hero: {
        enabled: true,
        title: 'Welcome to Our Blog',
        subtitle: 'Discover amazing recipes and cooking tips',
        backgroundImage: '',
        backgroundColor: '#f8fafc',
        ctaText: 'Explore Recipes',
        ctaLink: '/articles?type=recipe',
        showSearch: true,
      },
      featuredPosts: {
        enabled: true,
        title: 'Featured Articles',
        subtitle: 'Handpicked content for you',
        displayType: 'grid',
        maxPosts: 6,
        categoryFilter: 'all',
        tagFilter: 'all',
        sortBy: 'published_at',
        sortOrder: 'desc',
      },
      categories: {
        enabled: true,
        title: 'Browse by Category',
        subtitle: 'Find what interests you most',
        displayType: 'grid',
        maxCategories: 8,
        showPostCount: true,
        showDescription: false,
      },
      latestPosts: {
        enabled: true,
        title: 'Latest Posts',
        subtitle: 'Stay updated with our newest content',
        maxPosts: 12,
        showExcerpt: true,
        showAuthor: true,
        showDate: true,
        showViews: false,
      },
      popularPosts: {
        enabled: true,
        title: 'Most Popular',
        subtitle: 'What everyone is reading',
        maxPosts: 6,
        timeRange: '30d',
        showViews: true,
        showExcerpt: false,
      },
      newsletter: {
        enabled: true,
        title: 'Stay Updated',
        subtitle: 'Get the latest recipes and tips delivered to your inbox',
        description: 'Subscribe to our newsletter for weekly recipes, cooking tips, and exclusive content.',
        buttonText: 'Subscribe Now',
        placeholderText: 'Enter your email address',
        successMessage: 'Thank you for subscribing!',
        privacyText: 'We respect your privacy. Unsubscribe at any time.',
      },
      banners: {
        enabled: false,
        banner1: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          link: '',
          buttonText: 'Learn More',
          position: 'top',
          size: 'large',
        },
        banner2: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          link: '',
          buttonText: 'Learn More',
          position: 'middle',
          size: 'medium',
        },
      },
      socialProof: {
        enabled: false,
        title: 'Join Our Community',
        subtitle: 'Trusted by thousands of home cooks',
        stats: [
          { label: 'Recipes', value: '500+', icon: 'chef-hat' },
          { label: 'Happy Readers', value: '10K+', icon: 'users' },
          { label: 'Countries', value: '50+', icon: 'globe' },
        ],
      },
      customSections: [],
      seo: {
        metaTitle: 'Homepage - Delicious Recipes & Cooking Tips',
        metaDescription: 'Discover amazing recipes, cooking techniques, and kitchen tips from professional chefs and home cooks.',
        canonicalUrl: '',
        ogImage: '',
      },
    };
    setHomepage(mockHomepage);
    setFormData(prev => ({ ...prev, ...mockHomepage }));
  }, [setHomepage]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setHomepage(formData);
      toast.success('Homepage configuration synchronized successfully');
    } catch (error) {
      console.error('Failed to save homepage settings:', error);
      toast.error('Failed to synchronize settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!homepage || Object.keys(homepage).length === 0) return;
    setFormData(prev => ({ ...prev, ...homepage }));
    toast.success('Changes reverted to last saved state');
  };

  const sectionStatus = [
    { key: 'hero', label: 'Hero', enabled: formData.hero.enabled },
    { key: 'featured', label: 'Featured', enabled: formData.featuredPosts.enabled },
    { key: 'categories', label: 'Categories', enabled: formData.categories.enabled },
    { key: 'latest', label: 'Latest', enabled: formData.latestPosts.enabled },
    { key: 'popular', label: 'Popular', enabled: formData.popularPosts.enabled },
    { key: 'newsletter', label: 'Newsletter', enabled: formData.newsletter.enabled },
    { key: 'banners', label: 'Banners', enabled: formData.banners.enabled },
  ];

  const activeSections = sectionStatus.filter(section => section.enabled).length;
  const totalSections = sectionStatus.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>Error loading homepage settings: {error}</p>
      </div>
    );
    }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-3xl border border-border/40 bg-gradient-to-r from-background via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
              <Home className="h-3.5 w-3.5" />
              Storefront Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Homepage Configuration</h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Curate your homepage sections, arrange featured content, and refine the storefront narrative.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
            <Badge variant="secondary" className="h-8 px-3 rounded-full text-[10px] uppercase tracking-[0.16em]">
              Active Sections {activeSections}/{totalSections}
            </Badge>
            <Button
              variant="ghost"
              className="h-9 px-3 rounded-full border border-border/50 hover:bg-accent/60"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              className="h-9 px-4 rounded-full border-border/60 hover:bg-accent/50 group"
              onClick={() => window.open('/', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
              Live Site
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 gap-2 shadow-lg shadow-primary/20 rounded-full"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Syncing...' : 'Publish Changes'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-6 self-start">
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Sections
                </span>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                  {activeSections}/{totalSections} active
                </Badge>
              </div>
              <TabsList className="grid gap-2 bg-transparent p-0 w-full h-auto">
                <TabsTrigger value="hero" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <LayoutPanelLeft className="w-3.5 h-3.5 mr-2" /> Hero
                </TabsTrigger>
                <TabsTrigger value="featured" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Star className="w-3.5 h-3.5 mr-2" /> Featured
                </TabsTrigger>
                <TabsTrigger value="categories" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Grid className="w-3.5 h-3.5 mr-2" /> Categories
                </TabsTrigger>
                <TabsTrigger value="latest" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Newspaper className="w-3.5 h-3.5 mr-2" /> Latest
                </TabsTrigger>
                <TabsTrigger value="popular" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 mr-2" /> Popular
                </TabsTrigger>
                <TabsTrigger value="newsletter" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Mail className="w-3.5 h-3.5 mr-2" /> Newsletter
                </TabsTrigger>
                <TabsTrigger value="banners" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <AppWindow className="w-3.5 h-3.5 mr-2" /> Banners
                </TabsTrigger>
                <TabsTrigger value="seo" className="justify-start w-full rounded-xl px-3 py-2 text-xs text-left border border-transparent data-[state=active]:bg-background data-[state=active]:border-border/60 data-[state=active]:shadow-sm">
                  <Search className="w-3.5 h-3.5 mr-2" /> SEO
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="rounded-2xl border border-border/40 bg-background/60 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Status Snapshot
              </div>
              <div className="mt-3 space-y-2">
                {sectionStatus.map((section) => (
                  <div key={section.key} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{section.label}</span>
                    <span className={section.enabled ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {section.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-8">

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                       <LayoutPanelLeft className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Hero Section</CardTitle>
                      <CardDescription className="text-sm font-medium">The main value proposition and call-to-action above the fold.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                    <Switch
                      checked={formData.hero.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('hero', 'enabled', checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Badge variant={formData.hero.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.hero.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.hero.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Hero Title</Label>
                          <Input
                            value={formData.hero.title}
                            onChange={(e) => handleNestedInputChange('hero', 'title', e.target.value)}
                            className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-primary/50 text-lg font-bold"
                            placeholder="Enter main headline..."
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">CTA Label</Label>
                          <Input
                            value={formData.hero.ctaText}
                            onChange={(e) => handleNestedInputChange('hero', 'ctaText', e.target.value)}
                            className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-primary/50 font-bold"
                            placeholder="e.g. Explore Now"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Sub-headline Description</Label>
                        <Textarea
                          value={formData.hero.subtitle}
                          onChange={(e) => handleNestedInputChange('hero', 'subtitle', e.target.value)}
                          className="min-h-[100px] rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-primary/50 leading-relaxed"
                          placeholder="Provide context for your storefront..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Asset URL (Background)</Label>
                          <div className="relative group/input">
                             <Input
                               value={formData.hero.backgroundImage}
                               onChange={(e) => handleNestedInputChange('hero', 'backgroundImage', e.target.value)}
                               className="h-12 pl-10 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-primary/50 font-mono text-sm"
                               placeholder="https://cdn.example.com/hero.jpg"
                             />
                             <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 group-hover/input:text-primary group-hover/input:opacity-100 transition-all" />
                          </div>
                        </div>
                        <div className="space-y-3 relative">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Brand Accent Color</Label>
                          <div className="flex items-center h-12 rounded-2xl ring-1 ring-border/50 bg-background/50 overflow-hidden px-1 group/color">
                            <div
                              ref={heroColorTriggerRef}
                              className="h-9 w-9 rounded-xl border border-border/40 cursor-pointer shadow-sm transition-transform hover:scale-110 active:scale-95 m-1"
                              style={{ backgroundColor: formData.hero.backgroundColor || '#FFFFFF' }}
                              onClick={() => setShowHeroColorPicker(!showHeroColorPicker)}
                            />
                            <Input
                              value={formData.hero.backgroundColor}
                              onChange={(e) => handleNestedInputChange('hero', 'backgroundColor', e.target.value)}
                              className="flex-1 border-none shadow-none focus-visible:ring-0 font-mono text-xs font-bold uppercase"
                              placeholder="#FFFFFF"
                            />
                          </div>
                          {showHeroColorPicker && (
                            <ColorPicker
                              color={formData.hero.backgroundColor}
                              onChange={(color) => handleNestedInputChange('hero', 'backgroundColor', color)}
                              onClose={() => setShowHeroColorPicker(false)}
                              triggerRect={heroColorTriggerRef.current?.getBoundingClientRect()}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-accent/20 border border-border/20 shadow-inner">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                               <Search className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                               <p className="text-sm font-bold">In-Hero Product Discovery</p>
                               <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Enable search input within the hero container.</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <Switch
                              checked={formData.hero.showSearch}
                              onCheckedChange={(checked) => handleNestedInputChange('hero', 'showSearch', checked)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <Badge variant="outline" className="h-6 px-3 text-[10px] uppercase font-black opacity-60">Search Protocol</Badge>
                         </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Featured Posts Section */}
        <TabsContent value="featured" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                       <Star className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Curated Showcases</CardTitle>
                      <CardDescription className="text-sm font-medium">Highlight your best performing or manual-selected articles.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.featuredPosts.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('featuredPosts', 'enabled', checked)}
                      className="data-[state=checked]:bg-amber-500"
                    />
                    <Badge variant={formData.featuredPosts.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.featuredPosts.enabled ? "Enabled" : "Paused"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.featuredPosts.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Section Header</Label>
                           <Input
                             value={formData.featuredPosts.title}
                             onChange={(e) => handleNestedInputChange('featuredPosts', 'title', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-amber-500/50 text-lg font-bold"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Presentation Mode</Label>
                           <Select
                             value={formData.featuredPosts.displayType}
                             onValueChange={(value) => handleNestedInputChange('featuredPosts', 'displayType', value)}
                           >
                             <SelectTrigger className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-amber-500/50 font-bold">
                               <SelectValue placeholder="Choose layout..." />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-border/40">
                               <SelectItem value="grid">Mosaic Grid</SelectItem>
                               <SelectItem value="list">Editorial List</SelectItem>
                               <SelectItem value="carousel">Dynamic Slider</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>

                       <div className="space-y-3">
                         <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Section Descriptor</Label>
                         <Input
                           value={formData.featuredPosts.subtitle}
                           onChange={(e) => handleNestedInputChange('featuredPosts', 'subtitle', e.target.value)}
                           className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-amber-500/50 font-medium"
                         />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Capacity</Label>
                           <div className="flex items-center gap-3 h-12 px-4 rounded-2xl ring-1 ring-border/50 bg-background/50 group/input">
                              <Input
                                type="number"
                                value={formData.featuredPosts.maxPosts}
                                onChange={(e) => handleNestedInputChange('featuredPosts', 'maxPosts', parseInt(e.target.value))}
                                className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-center w-12"
                                min="1"
                                max="20"
                              />
                              <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Items</span>
                           </div>
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Logic Source</Label>
                           <Select
                             value={formData.featuredPosts.sortBy}
                             onValueChange={(value) => handleNestedInputChange('featuredPosts', 'sortBy', value)}
                           >
                             <SelectTrigger className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-amber-500/50 font-bold">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-border/40">
                               <SelectItem value="published_at">Chronological</SelectItem>
                               <SelectItem value="views">Engagement (Views)</SelectItem>
                               <SelectItem value="favorites">Popularity (Likes)</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Sequence</Label>
                           <Select
                             value={formData.featuredPosts.sortOrder}
                             onValueChange={(value) => handleNestedInputChange('featuredPosts', 'sortOrder', value)}
                           >
                             <SelectTrigger className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-amber-500/50 font-bold">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-border/40">
                               <SelectItem value="desc">Descending</SelectItem>
                               <SelectItem value="asc">Ascending</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Categories Section */}
        <TabsContent value="categories" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                       <Layout className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Taxonomy Browser</CardTitle>
                      <CardDescription className="text-sm font-medium">Quick navigation blocks for your content architecture.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.categories.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('categories', 'enabled', checked)}
                      className="data-[state=checked]:bg-indigo-500"
                    />
                    <Badge variant={formData.categories.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.categories.enabled ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.categories.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Display Title</Label>
                           <Input
                             value={formData.categories.title}
                             onChange={(e) => handleNestedInputChange('categories', 'title', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-indigo-500/50 text-lg font-bold"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Visual Architecture</Label>
                           <Select
                             value={formData.categories.displayType}
                             onValueChange={(value) => handleNestedInputChange('categories', 'displayType', value)}
                           >
                             <SelectTrigger className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-indigo-500/50 font-bold">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-border/40">
                               <SelectItem value="grid">Interactive Cards</SelectItem>
                               <SelectItem value="list">Compact Feed</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Sub-context</Label>
                            <Input
                              value={formData.categories.subtitle}
                              onChange={(e) => handleNestedInputChange('categories', 'subtitle', e.target.value)}
                              className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-3">
                             <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Display Limit</Label>
                             <div className="flex items-center gap-3 h-12 px-4 rounded-2xl ring-1 ring-border/50 bg-background/50 group/input">
                                <Input
                                  type="number"
                                  value={formData.categories.maxCategories}
                                  onChange={(e) => handleNestedInputChange('categories', 'maxCategories', parseInt(e.target.value))}
                                  className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-center w-12"
                                  min="1"
                                  max="20"
                                />
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Categories</span>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          <div className="flex items-center justify-between p-5 rounded-[22px] bg-accent/20 border border-border/20 group/opt hover:bg-accent/30 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                   <Plus className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">Discovery Counts</p>
                                   <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Show article tally per category.</p>
                                </div>
                             </div>
                             <Switch
                               checked={formData.categories.showPostCount}
                               onCheckedChange={(checked) => handleNestedInputChange('categories', 'showPostCount', checked)}
                               className="data-[state=checked]:bg-indigo-500"
                             />
                          </div>
                          
                          <div className="flex items-center justify-between p-5 rounded-[22px] bg-accent/20 border border-border/20 group/opt hover:bg-accent/30 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                   <FileText className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">Detailed Meta</p>
                                   <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Display category summaries.</p>
                                </div>
                             </div>
                             <Switch
                               checked={formData.categories.showDescription}
                               onCheckedChange={(checked) => handleNestedInputChange('categories', 'showDescription', checked)}
                               className="data-[state=checked]:bg-indigo-500"
                             />
                          </div>
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Latest Posts Section */}
        <TabsContent value="latest" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                       <Newspaper className="h-6 w-6 text-sky-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Recent Discovery</CardTitle>
                      <CardDescription className="text-sm font-medium">Automatic stream of your most recently published content.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.latestPosts.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'enabled', checked)}
                      className="data-[state=checked]:bg-sky-500"
                    />
                    <Badge variant={formData.latestPosts.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.latestPosts.enabled ? "Live" : "Standby"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.latestPosts.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Editorial Title</Label>
                           <Input
                             value={formData.latestPosts.title}
                             onChange={(e) => handleNestedInputChange('latestPosts', 'title', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-sky-500/50 text-lg font-bold"
                           />
                         </div>
                         <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Inventory Limit</Label>
                            <div className="flex items-center gap-3 h-12 px-4 rounded-2xl ring-1 ring-border/50 bg-background/50 group/input">
                               <Input
                                 type="number"
                                 value={formData.latestPosts.maxPosts}
                                 onChange={(e) => handleNestedInputChange('latestPosts', 'maxPosts', parseInt(e.target.value))}
                                 className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-center w-12"
                                 min="1"
                                 max="50"
                               />
                               <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Posts</span>
                            </div>
                         </div>
                       </div>

                       <div className="space-y-3">
                         <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Section Header Text</Label>
                         <Input
                           value={formData.latestPosts.subtitle}
                           onChange={(e) => handleNestedInputChange('latestPosts', 'subtitle', e.target.value)}
                           className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-sky-500/50 font-medium"
                         />
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                          {[
                            { id: 'showExcerpt', label: 'Excerpts', icon: FileText },
                            { id: 'showAuthor', label: 'Authors', icon: Grid },
                            { id: 'showDate', label: 'Dates', icon: Newspaper },
                            { id: 'showViews', label: 'Views', icon: Eye }
                          ].map((item) => (
                            <div key={item.id} className="flex flex-col gap-4 p-5 rounded-3xl bg-accent/20 border border-border/20 hover:bg-accent/30 transition-colors">
                               <div className="flex items-center justify-between">
                                  <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                     <item.icon className="h-3.5 w-3.5 text-sky-500" />
                                  </div>
                                  <Switch
                                    checked={formData.latestPosts[item.id]}
                                    onCheckedChange={(checked) => handleNestedInputChange('latestPosts', item.id, checked)}
                                    className="data-[state=checked]:bg-sky-500 h-5 w-9 [&>span]:h-4 [&>span]:w-4"
                                  />
                               </div>
                               <div>
                                  <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                                  <p className="text-[9px] text-muted-foreground font-medium">Toggle visibility</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Popular Posts Section */}
        <TabsContent value="popular" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                       <Sparkles className="h-6 w-6 text-rose-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Viral Trending</CardTitle>
                      <CardDescription className="text-sm font-medium">Highlight content with highest engagement and velocity.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.popularPosts.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'enabled', checked)}
                      className="data-[state=checked]:bg-rose-500"
                    />
                    <Badge variant={formData.popularPosts.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.popularPosts.enabled ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.popularPosts.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Section Heading</Label>
                           <Input
                             value={formData.popularPosts.title}
                             onChange={(e) => handleNestedInputChange('popularPosts', 'title', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-rose-500/50 text-lg font-bold"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Engagement Horizon</Label>
                           <Select
                             value={formData.popularPosts.timeRange}
                             onValueChange={(value) => handleNestedInputChange('popularPosts', 'timeRange', value)}
                           >
                             <SelectTrigger className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-rose-500/50 font-bold">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-border/40">
                               <SelectItem value="7d">Last Week</SelectItem>
                               <SelectItem value="30d">Last Month</SelectItem>
                               <SelectItem value="90d">Last Quarter</SelectItem>
                               <SelectItem value="all">All Time History</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Context Summary</Label>
                            <Input
                              value={formData.popularPosts.subtitle}
                              onChange={(e) => handleNestedInputChange('popularPosts', 'subtitle', e.target.value)}
                              className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-rose-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-3">
                             <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Discovery Limit</Label>
                             <div className="flex items-center gap-3 h-12 px-4 rounded-2xl ring-1 ring-border/50 bg-background/50 group/input">
                                <Input
                                  type="number"
                                  value={formData.popularPosts.maxPosts}
                                  onChange={(e) => handleNestedInputChange('popularPosts', 'maxPosts', parseInt(e.target.value))}
                                  className="border-none shadow-none focus-visible:ring-0 p-0 font-bold text-center w-12"
                                  min="1"
                                  max="20"
                                />
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Items</span>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          <div className="flex items-center justify-between p-5 rounded-[22px] bg-accent/20 border border-border/20 group/opt hover:bg-accent/30 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                   <Eye className="h-4 w-4 text-rose-500" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">Visibility Metrics</p>
                                   <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Display real-time view counts.</p>
                                </div>
                             </div>
                             <Switch
                               checked={formData.popularPosts.showViews}
                               onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showViews', checked)}
                               className="data-[state=checked]:bg-rose-500"
                             />
                          </div>
                          
                          <div className="flex items-center justify-between p-5 rounded-[22px] bg-accent/20 border border-border/20 group/opt hover:bg-accent/30 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                   <FileText className="h-4 w-4 text-rose-500" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">Content Summaries</p>
                                   <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Show short reading previews.</p>
                                </div>
                             </div>
                             <Switch
                               checked={formData.popularPosts.showExcerpt}
                               onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showExcerpt', checked)}
                               className="data-[state=checked]:bg-rose-500"
                             />
                          </div>
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Newsletter Section */}
        <TabsContent value="newsletter" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                       <Mail className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Lead Capture</CardTitle>
                      <CardDescription className="text-sm font-medium">Grow your subscriber base with a high-conversion newsletter block.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.newsletter.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('newsletter', 'enabled', checked)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <Badge variant={formData.newsletter.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.newsletter.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.newsletter.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Call-to-Action Title</Label>
                           <Input
                             value={formData.newsletter.title}
                             onChange={(e) => handleNestedInputChange('newsletter', 'title', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 text-lg font-bold"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Button Narrative</Label>
                           <Input
                             value={formData.newsletter.buttonText}
                             onChange={(e) => handleNestedInputChange('newsletter', 'buttonText', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 font-bold"
                           />
                         </div>
                       </div>

                       <div className="space-y-3">
                         <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Secondary Headline</Label>
                         <Input
                           value={formData.newsletter.subtitle}
                           onChange={(e) => handleNestedInputChange('newsletter', 'subtitle', e.target.value)}
                           className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 font-medium"
                         />
                       </div>

                       <div className="space-y-3">
                         <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Value Proposition (Long-form)</Label>
                         <Textarea
                           value={formData.newsletter.description}
                           onChange={(e) => handleNestedInputChange('newsletter', 'description', e.target.value)}
                           className="min-h-[100px] rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 leading-relaxed"
                           rows={3}
                         />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Input Placeholder</Label>
                           <Input
                             value={formData.newsletter.placeholderText}
                             onChange={(e) => handleNestedInputChange('newsletter', 'placeholderText', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 font-medium italic"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Success Affirmation</Label>
                           <Input
                             value={formData.newsletter.successMessage}
                             onChange={(e) => handleNestedInputChange('newsletter', 'successMessage', e.target.value)}
                             className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 font-bold text-emerald-600"
                           />
                         </div>
                       </div>

                       <div className="space-y-3">
                         <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Compliance & Privacy Footer</Label>
                         <Textarea
                           value={formData.newsletter.privacyText}
                           onChange={(e) => handleNestedInputChange('newsletter', 'privacyText', e.target.value)}
                           className="min-h-[60px] rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-emerald-500/50 text-xs font-medium opacity-80"
                           rows={2}
                         />
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Banners Section */}
        <TabsContent value="banners" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                       <AppWindow className="h-6 w-6 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Promotional Slots</CardTitle>
                      <CardDescription className="text-sm font-medium">Strategic real-estate for campaigns, announcements, and partnerships.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-2xl border border-border/40 shadow-sm">
                    <Switch
                      checked={formData.banners.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('banners', 'enabled', checked)}
                      className="data-[state=checked]:bg-violet-500"
                    />
                    <Badge variant={formData.banners.enabled ? "default" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold">
                       {formData.banners.enabled ? "Active" : "Opaque"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {formData.banners.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-8 space-y-8">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Banner 1 */}
                          <div className="group/banner p-6 rounded-[28px] bg-accent/10 border border-border/30 hover:bg-accent/20 transition-all hover:shadow-lg hover:shadow-black/5">
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                      <span className="text-xs font-black text-violet-500">B1</span>
                                   </div>
                                   <p className="text-sm font-bold uppercase tracking-widest opacity-80">Primary Slot</p>
                                </div>
                                <Switch
                                  checked={formData.banners.banner1.enabled}
                                  onCheckedChange={(checked) => handleNestedInputChange('banners', 'banner1', {
                                    ...formData.banners.banner1,
                                    enabled: checked
                                  })}
                                  className="data-[state=checked]:bg-violet-500"
                                />
                             </div>

                             <AnimatePresence>
                               {formData.banners.banner1.enabled && (
                                 <motion.div
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   exit={{ opacity: 0, y: -10 }}
                                   className="space-y-5"
                                 >
                                    <div className="space-y-2">
                                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Banner Heading</Label>
                                       <Input
                                         value={formData.banners.banner1.title}
                                         onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                                           ...formData.banners.banner1,
                                           title: e.target.value
                                         })}
                                         className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 font-bold"
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Asset Reference (URL)</Label>
                                       <Input
                                         value={formData.banners.banner1.image}
                                         onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                                           ...formData.banners.banner1,
                                           image: e.target.value
                                         })}
                                         className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 font-mono text-[11px]"
                                         placeholder="https://..."
                                       />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Button Narrative</Label>
                                          <Input
                                            value={formData.banners.banner1.buttonText}
                                            onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                                              ...formData.banners.banner1,
                                              buttonText: e.target.value
                                            })}
                                            className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 text-xs font-black uppercase"
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Scale</Label>
                                          <Select
                                            value={formData.banners.banner1.size}
                                            onValueChange={(value) => handleNestedInputChange('banners', 'banner1', {
                                              ...formData.banners.banner1,
                                              size: value
                                            })}
                                          >
                                            <SelectTrigger className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 text-xs font-bold">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/40">
                                              <SelectItem value="small">Compact</SelectItem>
                                              <SelectItem value="medium">Standard</SelectItem>
                                              <SelectItem value="large">Expansive</SelectItem>
                                            </SelectContent>
                                          </Select>
                                       </div>
                                    </div>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                          </div>

                          {/* Banner 2 */}
                          <div className="group/banner p-6 rounded-[28px] bg-accent/10 border border-border/30 hover:bg-accent/20 transition-all hover:shadow-lg hover:shadow-black/5">
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                   <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                      <span className="text-xs font-black text-violet-500">B2</span>
                                   </div>
                                   <p className="text-sm font-bold uppercase tracking-widest opacity-80">Secondary Slot</p>
                                </div>
                                <Switch
                                  checked={formData.banners.banner2.enabled}
                                  onCheckedChange={(checked) => handleNestedInputChange('banners', 'banner2', {
                                    ...formData.banners.banner2,
                                    enabled: checked
                                  })}
                                  className="data-[state=checked]:bg-violet-500"
                                />
                             </div>

                             <AnimatePresence>
                               {formData.banners.banner2.enabled && (
                                 <motion.div
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   exit={{ opacity: 0, y: -10 }}
                                   className="space-y-5"
                                 >
                                    <div className="space-y-2">
                                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Banner Heading</Label>
                                       <Input
                                         value={formData.banners.banner2.title}
                                         onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                                           ...formData.banners.banner2,
                                           title: e.target.value
                                         })}
                                         className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 font-bold"
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Asset Reference (URL)</Label>
                                       <Input
                                         value={formData.banners.banner2.image}
                                         onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                                           ...formData.banners.banner2,
                                           image: e.target.value
                                         })}
                                         className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 font-mono text-[11px]"
                                         placeholder="https://..."
                                       />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Button Narrative</Label>
                                          <Input
                                            value={formData.banners.banner2.buttonText}
                                            onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                                              ...formData.banners.banner2,
                                              buttonText: e.target.value
                                            })}
                                            className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 text-xs font-black uppercase"
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Scale</Label>
                                          <Select
                                            value={formData.banners.banner2.size}
                                            onValueChange={(value) => handleNestedInputChange('banners', 'banner2', {
                                              ...formData.banners.banner2,
                                              size: value
                                            })}
                                          >
                                            <SelectTrigger className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-violet-500/50 text-xs font-bold">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/40">
                                              <SelectItem value="small">Compact</SelectItem>
                                              <SelectItem value="medium">Standard</SelectItem>
                                              <SelectItem value="large">Expansive</SelectItem>
                                            </SelectContent>
                                          </Select>
                                       </div>
                                    </div>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                          </div>
                       </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo" className="space-y-6 outline-none">
          <motion.div
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/50 border-border/40 rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
              <CardHeader className="p-8 border-b border-border/40 bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                       <Search className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Search Optimization</CardTitle>
                      <CardDescription className="text-sm font-medium">Fine-tune how your homepage appears in search results and social shares.</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Meta Title Tag</Label>
                       <Input
                         value={formData.seo.metaTitle}
                         onChange={(e) => handleNestedInputChange('seo', 'metaTitle', e.target.value)}
                         className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-orange-500/50 text-lg font-bold"
                         placeholder="Target Keywords | Brand Name"
                       />
                       <p className="text-[10px] text-muted-foreground font-medium px-1 italic">Optimal length: 50-60 characters.</p>
                    </div>
                    <div className="space-y-3">
                       <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Focus Keyword</Label>
                       <Input
                         value={formData.seo.keywords}
                         onChange={(e) => handleNestedInputChange('seo', 'keywords', e.target.value)}
                         className="h-12 rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-orange-500/50 font-bold"
                         placeholder="recipes, cooking, blog, saas"
                       />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Meta Description</Label>
                    <Textarea
                      value={formData.seo.metaDescription}
                      onChange={(e) => handleNestedInputChange('seo', 'metaDescription', e.target.value)}
                      className="min-h-[120px] rounded-2xl border-none ring-1 ring-border/50 bg-background/50 focus-visible:ring-orange-500/50 leading-relaxed"
                      rows={4}
                      placeholder="Write a compelling summary for search engine results..."
                    />
                    <div className="flex justify-between px-1">
                       <p className="text-[10px] text-muted-foreground font-medium italic">Optimal length: 150-160 characters.</p>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{formData.seo.metaDescription.length} chars</p>
                    </div>
                 </div>

                 <div className="group/og p-8 rounded-[32px] bg-accent/20 border border-border/30 hover:bg-accent/30 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                          <Grid className="h-5 w-5 text-orange-500" />
                       </div>
                       <div>
                          <p className="text-sm font-bold uppercase tracking-widest">Social Visibility (Open Graph)</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none">Settings for Facebook, Twitter, and LinkedIn.</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Share Thumbnail (URL)</Label>
                          <Input
                            value={formData.seo.ogImage}
                            onChange={(e) => handleNestedInputChange('seo', 'ogImage', e.target.value)}
                            className="h-10 rounded-xl border-none ring-1 ring-border/50 bg-background/50 focus:ring-orange-500/50 font-mono text-[11px]"
                            placeholder="https://..."
                          />
                       </div>
                       <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-border/20">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border/40">
                                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                             </div>
                             <div>
                                <p className="text-xs font-bold">Search Visibility</p>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Allow indexers to crawl this site.</p>
                             </div>
                          </div>
                          <Switch
                            checked={formData.seo.indexing}
                            onCheckedChange={(checked) => handleNestedInputChange('seo', 'indexing', checked)}
                            className="data-[state=checked]:bg-orange-500"
                          />
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Homepage;
