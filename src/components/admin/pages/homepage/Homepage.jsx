import { useState, useEffect } from 'react';
import { Save, Home, Image, FileText, Star, Eye, Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { useHomepageStore } from '../../store/useStore';

const Homepage = () => {
  const { homepage, loading, error, setHomepage } = useHomepageStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
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
      setSaveStatus(null);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In real app, this would save to API
      setHomepage(formData);
      setSaveStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save homepage settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-8 h-8" />
            Homepage
          </h2>
          <p className="text-muted-foreground mt-1">
            Customize your homepage layout and content
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <Save className="h-4 w-4" />
          <AlertDescription>
            Homepage settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <X className="h-4 w-4" />
          <AlertDescription>
            Failed to save homepage settings. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Homepage Tabs */}
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="latest">Latest</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hero Section</CardTitle>
                  <CardDescription>The main banner area at the top of your homepage</CardDescription>
                </div>
                <Switch
                  checked={formData.hero.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('hero', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.hero.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Title</Label>
                    <Input
                      id="heroTitle"
                      value={formData.hero.title}
                      onChange={(e) => handleNestedInputChange('hero', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroCtaText">CTA Button Text</Label>
                    <Input
                      id="heroCtaText"
                      value={formData.hero.ctaText}
                      onChange={(e) => handleNestedInputChange('hero', 'ctaText', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={formData.hero.subtitle}
                    onChange={(e) => handleNestedInputChange('hero', 'subtitle', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroBackgroundImage">Background Image URL</Label>
                    <Input
                      id="heroBackgroundImage"
                      value={formData.hero.backgroundImage}
                      onChange={(e) => handleNestedInputChange('hero', 'backgroundImage', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroBackgroundColor">Background Color</Label>
                    <Input
                      id="heroBackgroundColor"
                      type="color"
                      value={formData.hero.backgroundColor}
                      onChange={(e) => handleNestedInputChange('hero', 'backgroundColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroCtaLink">CTA Link</Label>
                  <Input
                    id="heroCtaLink"
                    value={formData.hero.ctaLink}
                    onChange={(e) => handleNestedInputChange('hero', 'ctaLink', e.target.value)}
                    placeholder="/articles?type=recipe"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="heroShowSearch"
                    checked={formData.hero.showSearch}
                    onCheckedChange={(checked) => handleNestedInputChange('hero', 'showSearch', checked)}
                  />
                  <Label htmlFor="heroShowSearch">Show search bar</Label>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Featured Posts Section */}
        <TabsContent value="featured" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Featured Posts</CardTitle>
                  <CardDescription>Highlight important articles on your homepage</CardDescription>
                </div>
                <Switch
                  checked={formData.featuredPosts.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('featuredPosts', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.featuredPosts.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="featuredTitle">Section Title</Label>
                    <Input
                      id="featuredTitle"
                      value={formData.featuredPosts.title}
                      onChange={(e) => handleNestedInputChange('featuredPosts', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featuredDisplayType">Display Type</Label>
                    <Select
                      value={formData.featuredPosts.displayType}
                      onValueChange={(value) => handleNestedInputChange('featuredPosts', 'displayType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featuredSubtitle">Subtitle</Label>
                  <Input
                    id="featuredSubtitle"
                    value={formData.featuredPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('featuredPosts', 'subtitle', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="featuredMaxPosts">Max Posts</Label>
                    <Input
                      id="featuredMaxPosts"
                      type="number"
                      value={formData.featuredPosts.maxPosts}
                      onChange={(e) => handleNestedInputChange('featuredPosts', 'maxPosts', parseInt(e.target.value))}
                      min="1"
                      max="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featuredSortBy">Sort By</Label>
                    <Select
                      value={formData.featuredPosts.sortBy}
                      onValueChange={(value) => handleNestedInputChange('featuredPosts', 'sortBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published_at">Published Date</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                        <SelectItem value="favorites">Favorites</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featuredSortOrder">Sort Order</Label>
                    <Select
                      value={formData.featuredPosts.sortOrder}
                      onValueChange={(value) => handleNestedInputChange('featuredPosts', 'sortOrder', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Categories Section */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories Section</CardTitle>
                  <CardDescription>Display blog categories on your homepage</CardDescription>
                </div>
                <Switch
                  checked={formData.categories.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('categories', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.categories.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoriesTitle">Section Title</Label>
                    <Input
                      id="categoriesTitle"
                      value={formData.categories.title}
                      onChange={(e) => handleNestedInputChange('categories', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoriesDisplayType">Display Type</Label>
                    <Select
                      value={formData.categories.displayType}
                      onValueChange={(value) => handleNestedInputChange('categories', 'displayType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoriesSubtitle">Subtitle</Label>
                  <Input
                    id="categoriesSubtitle"
                    value={formData.categories.subtitle}
                    onChange={(e) => handleNestedInputChange('categories', 'subtitle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoriesMaxCategories">Max Categories</Label>
                  <Input
                    id="categoriesMaxCategories"
                    type="number"
                    value={formData.categories.maxCategories}
                    onChange={(e) => handleNestedInputChange('categories', 'maxCategories', parseInt(e.target.value))}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="categoriesShowPostCount"
                      checked={formData.categories.showPostCount}
                      onCheckedChange={(checked) => handleNestedInputChange('categories', 'showPostCount', checked)}
                    />
                    <Label htmlFor="categoriesShowPostCount">Show post count</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="categoriesShowDescription"
                      checked={formData.categories.showDescription}
                      onCheckedChange={(checked) => handleNestedInputChange('categories', 'showDescription', checked)}
                    />
                    <Label htmlFor="categoriesShowDescription">Show category descriptions</Label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Latest Posts Section */}
        <TabsContent value="latest" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Latest Posts</CardTitle>
                  <CardDescription>Show your most recent articles</CardDescription>
                </div>
                <Switch
                  checked={formData.latestPosts.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.latestPosts.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latestTitle">Section Title</Label>
                    <Input
                      id="latestTitle"
                      value={formData.latestPosts.title}
                      onChange={(e) => handleNestedInputChange('latestPosts', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="latestMaxPosts">Max Posts</Label>
                    <Input
                      id="latestMaxPosts"
                      type="number"
                      value={formData.latestPosts.maxPosts}
                      onChange={(e) => handleNestedInputChange('latestPosts', 'maxPosts', parseInt(e.target.value))}
                      min="1"
                      max="50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="latestSubtitle">Subtitle</Label>
                  <Input
                    id="latestSubtitle"
                    value={formData.latestPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('latestPosts', 'subtitle', e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="latestShowExcerpt"
                      checked={formData.latestPosts.showExcerpt}
                      onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showExcerpt', checked)}
                    />
                    <Label htmlFor="latestShowExcerpt">Show post excerpts</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="latestShowAuthor"
                      checked={formData.latestPosts.showAuthor}
                      onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showAuthor', checked)}
                    />
                    <Label htmlFor="latestShowAuthor">Show author names</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="latestShowDate"
                      checked={formData.latestPosts.showDate}
                      onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showDate', checked)}
                    />
                    <Label htmlFor="latestShowDate">Show publication dates</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="latestShowViews"
                      checked={formData.latestPosts.showViews}
                      onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showViews', checked)}
                    />
                    <Label htmlFor="latestShowViews">Show view counts</Label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Popular Posts Section */}
        <TabsContent value="popular" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Popular Posts</CardTitle>
                  <CardDescription>Highlight your most viewed content</CardDescription>
                </div>
                <Switch
                  checked={formData.popularPosts.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.popularPosts.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="popularTitle">Section Title</Label>
                    <Input
                      id="popularTitle"
                      value={formData.popularPosts.title}
                      onChange={(e) => handleNestedInputChange('popularPosts', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="popularTimeRange">Time Range</Label>
                    <Select
                      value={formData.popularPosts.timeRange}
                      onValueChange={(value) => handleNestedInputChange('popularPosts', 'timeRange', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="popularSubtitle">Subtitle</Label>
                  <Input
                    id="popularSubtitle"
                    value={formData.popularPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('popularPosts', 'subtitle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="popularMaxPosts">Max Posts</Label>
                  <Input
                    id="popularMaxPosts"
                    type="number"
                    value={formData.popularPosts.maxPosts}
                    onChange={(e) => handleNestedInputChange('popularPosts', 'maxPosts', parseInt(e.target.value))}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="popularShowViews"
                      checked={formData.popularPosts.showViews}
                      onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showViews', checked)}
                    />
                    <Label htmlFor="popularShowViews">Show view counts</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="popularShowExcerpt"
                      checked={formData.popularPosts.showExcerpt}
                      onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showExcerpt', checked)}
                    />
                    <Label htmlFor="popularShowExcerpt">Show post excerpts</Label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Newsletter Section */}
        <TabsContent value="newsletter" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Newsletter Signup</CardTitle>
                  <CardDescription>Collect email subscribers on your homepage</CardDescription>
                </div>
                <Switch
                  checked={formData.newsletter.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('newsletter', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.newsletter.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newsletterTitle">Section Title</Label>
                    <Input
                      id="newsletterTitle"
                      value={formData.newsletter.title}
                      onChange={(e) => handleNestedInputChange('newsletter', 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newsletterButtonText">Button Text</Label>
                    <Input
                      id="newsletterButtonText"
                      value={formData.newsletter.buttonText}
                      onChange={(e) => handleNestedInputChange('newsletter', 'buttonText', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newsletterSubtitle">Subtitle</Label>
                  <Input
                    id="newsletterSubtitle"
                    value={formData.newsletter.subtitle}
                    onChange={(e) => handleNestedInputChange('newsletter', 'subtitle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newsletterDescription">Description</Label>
                  <Textarea
                    id="newsletterDescription"
                    value={formData.newsletter.description}
                    onChange={(e) => handleNestedInputChange('newsletter', 'description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newsletterPlaceholderText">Email Placeholder</Label>
                    <Input
                      id="newsletterPlaceholderText"
                      value={formData.newsletter.placeholderText}
                      onChange={(e) => handleNestedInputChange('newsletter', 'placeholderText', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newsletterSuccessMessage">Success Message</Label>
                    <Input
                      id="newsletterSuccessMessage"
                      value={formData.newsletter.successMessage}
                      onChange={(e) => handleNestedInputChange('newsletter', 'successMessage', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newsletterPrivacyText">Privacy Text</Label>
                  <Textarea
                    id="newsletterPrivacyText"
                    value={formData.newsletter.privacyText}
                    onChange={(e) => handleNestedInputChange('newsletter', 'privacyText', e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Banners Section */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Homepage Banners</CardTitle>
                  <CardDescription>Add promotional banners to your homepage</CardDescription>
                </div>
                <Switch
                  checked={formData.banners.enabled}
                  onCheckedChange={(checked) => handleNestedInputChange('banners', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {formData.banners.enabled && (
              <CardContent className="space-y-6">
                {/* Banner 1 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Banner 1</h4>
                    <Switch
                      checked={formData.banners.banner1.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('banners', 'banner1', {
                        ...formData.banners.banner1,
                        enabled: checked
                      })}
                    />
                  </div>

                  {formData.banners.banner1.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="banner1Title">Title</Label>
                          <Input
                            id="banner1Title"
                            value={formData.banners.banner1.title}
                            onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                              ...formData.banners.banner1,
                              title: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner1ButtonText">Button Text</Label>
                          <Input
                            id="banner1ButtonText"
                            value={formData.banners.banner1.buttonText}
                            onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                              ...formData.banners.banner1,
                              buttonText: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner1Description">Description</Label>
                        <Textarea
                          id="banner1Description"
                          value={formData.banners.banner1.description}
                          onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                            ...formData.banners.banner1,
                            description: e.target.value
                          })}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="banner1Image">Image URL</Label>
                          <Input
                            id="banner1Image"
                            value={formData.banners.banner1.image}
                            onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                              ...formData.banners.banner1,
                              image: e.target.value
                            })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner1Link">Link URL</Label>
                          <Input
                            id="banner1Link"
                            value={formData.banners.banner1.link}
                            onChange={(e) => handleNestedInputChange('banners', 'banner1', {
                              ...formData.banners.banner1,
                              link: e.target.value
                            })}
                            placeholder="/articles/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner1Size">Size</Label>
                          <Select
                            value={formData.banners.banner1.size}
                            onValueChange={(value) => handleNestedInputChange('banners', 'banner1', {
                              ...formData.banners.banner1,
                              size: value
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner 2 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Banner 2</h4>
                    <Switch
                      checked={formData.banners.banner2.enabled}
                      onCheckedChange={(checked) => handleNestedInputChange('banners', 'banner2', {
                        ...formData.banners.banner2,
                        enabled: checked
                      })}
                    />
                  </div>

                  {formData.banners.banner2.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="banner2Title">Title</Label>
                          <Input
                            id="banner2Title"
                            value={formData.banners.banner2.title}
                            onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                              ...formData.banners.banner2,
                              title: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner2ButtonText">Button Text</Label>
                          <Input
                            id="banner2ButtonText"
                            value={formData.banners.banner2.buttonText}
                            onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                              ...formData.banners.banner2,
                              buttonText: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner2Description">Description</Label>
                        <Textarea
                          id="banner2Description"
                          value={formData.banners.banner2.description}
                          onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                            ...formData.banners.banner2,
                            description: e.target.value
                          })}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="banner2Image">Image URL</Label>
                          <Input
                            id="banner2Image"
                            value={formData.banners.banner2.image}
                            onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                              ...formData.banners.banner2,
                              image: e.target.value
                            })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner2Link">Link URL</Label>
                          <Input
                            id="banner2Link"
                            value={formData.banners.banner2.link}
                            onChange={(e) => handleNestedInputChange('banners', 'banner2', {
                              ...formData.banners.banner2,
                              link: e.target.value
                            })}
                            placeholder="/articles/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner2Size">Size</Label>
                          <Select
                            value={formData.banners.banner2.size}
                            onValueChange={(value) => handleNestedInputChange('banners', 'banner2', {
                              ...formData.banners.banner2,
                              size: value
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage SEO</CardTitle>
              <CardDescription>Optimize your homepage for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoMetaTitle">Meta Title</Label>
                <Input
                  id="seoMetaTitle"
                  value={formData.seo.metaTitle}
                  onChange={(e) => handleNestedInputChange('seo', 'metaTitle', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoMetaDescription">Meta Description</Label>
                <Textarea
                  id="seoMetaDescription"
                  value={formData.seo.metaDescription}
                  onChange={(e) => handleNestedInputChange('seo', 'metaDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoCanonicalUrl">Canonical URL</Label>
                <Input
                  id="seoCanonicalUrl"
                  value={formData.seo.canonicalUrl}
                  onChange={(e) => handleNestedInputChange('seo', 'canonicalUrl', e.target.value)}
                  placeholder="https://yourblog.com/"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoOgImage">Open Graph Image URL</Label>
                <Input
                  id="seoOgImage"
                  value={formData.seo.ogImage}
                  onChange={(e) => handleNestedInputChange('seo', 'ogImage', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Homepage;