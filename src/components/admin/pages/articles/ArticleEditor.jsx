import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import Editor from '@monaco-editor/react';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../services/api';
import { generateSlug, isValidJSON } from '../../utils/helpers';

const ArticleEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    slug: '',
    type: 'article',
    categorySlug: '',
    authorSlug: '',
    label: '',
    headline: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    shortDescription: '',
    tldr: '',
    introduction: '',
    summary: '',
    imageUrl: '',
    imageAlt: '',
    coverUrl: '',
    coverAlt: '',
    isOnline: false,
    isFavorite: false,
    publishedAt: '',
    selectedTags: [],
  });

  // JSON fields
  const [contentJson, setContentJson] = useState('{}');
  const [recipeJson, setRecipeJson] = useState('{}');
  const [faqsJson, setFaqsJson] = useState('[]');
  const [keywordsJson, setKeywordsJson] = useState('[]');
  const [referencesJson, setReferencesJson] = useState('[]');
  const [mediaJson, setMediaJson] = useState('{}');

  // JSON validation errors
  const [jsonErrors, setJsonErrors] = useState({});

  useEffect(() => {
    loadCategories();
    loadAuthors();
    loadTags();
    if (isEditMode) {
      loadArticle();
    }
  }, [slug, isEditMode]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAuthors = async () => {
    try {
      const response = await authorsAPI.getAll();
      if (response.data.success) {
        setAuthors(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load authors:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadArticle = async () => {
    try {
      setLoading(true);
      const response = await articlesAPI.getBySlug(slug);
      if (response.data.success) {
        const article = response.data.data;
        setFormData({
          slug: article.slug,
          type: article.type,
          categorySlug: article.categorySlug,
          authorSlug: article.authorSlug,
          label: article.label,
          headline: article.headline,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          canonicalUrl: article.canonicalUrl || '',
          shortDescription: article.shortDescription,
          tldr: article.tldr,
          introduction: article.introduction || '',
          summary: article.summary || '',
          imageUrl: article.image?.url || '',
          imageAlt: article.image?.alt || '',
          coverUrl: article.cover?.url || '',
          coverAlt: article.cover?.alt || '',
          isOnline: article.isOnline,
          isFavorite: article.isFavorite,
          publishedAt: article.publishedAt || '',
          selectedTags: article.tags?.map(t => t.id) || [],
        });

        // Load JSON fields
        setContentJson(JSON.stringify(article.content || {}, null, 2));
        setRecipeJson(JSON.stringify(article.recipe || {}, null, 2));
        setFaqsJson(JSON.stringify(article.faqs || [], null, 2));
        setKeywordsJson(JSON.stringify(article.keywords || [], null, 2));
        setReferencesJson(JSON.stringify(article.references || [], null, 2));
        setMediaJson(JSON.stringify(article.media || {}, null, 2));
      }
    } catch (error) {
      console.error('Failed to load article:', error);
      alert('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from label
    if (field === 'label' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const validateJSON = (field, value) => {
    if (!isValidJSON(value)) {
      setJsonErrors(prev => ({ ...prev, [field]: 'Invalid JSON' }));
      return false;
    } else {
      setJsonErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };

  const handleSave = async () => {
    // Validate all JSON fields
    const jsonFields = {
      content: contentJson,
      recipe: recipeJson,
      faqs: faqsJson,
      keywords: keywordsJson,
      references: referencesJson,
      media: mediaJson,
    };

    let hasErrors = false;
    Object.entries(jsonFields).forEach(([field, value]) => {
      if (!validateJSON(field, value)) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      alert('Please fix JSON errors before saving');
      return;
    }

    // Prepare data
    const data = {
      ...formData,
      contentJson,
      recipeJson,
      faqsJson,
      keywordsJson,
      referencesJson,
      mediaJson,
    };

    try {
      setSaving(true);
      if (isEditMode) {
        await articlesAPI.update(slug, data);
      } else {
        await articlesAPI.create(data);
      }
      navigate('/articles');
    } catch (error) {
      console.error('Failed to save article:', error);
      alert('Failed to save article: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/articles')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">
              {isEditMode ? 'Edit Article' : 'New Article'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isEditMode ? `Editing: ${formData.label}` : 'Create a new article or recipe'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/articles')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="recipe">Recipe Data</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="recipe">Recipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="article-slug"
                disabled={isEditMode}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Title *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="Article title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline *</Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => handleInputChange('headline', e.target.value)}
              placeholder="Catchy headline"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.categorySlug}
                onValueChange={(value) => handleInputChange('categorySlug', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Select
                value={formData.authorSlug}
                onValueChange={(value) => handleInputChange('authorSlug', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  {authors.map((author) => (
                    <SelectItem key={author.slug} value={author.slug}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description *</Label>
            <Textarea
              id="shortDescription"
              value={formData.shortDescription}
              onChange={(e) => handleInputChange('shortDescription', e.target.value)}
              placeholder="Brief description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tldr">TL;DR *</Label>
            <Textarea
              id="tldr"
              value={formData.tldr}
              onChange={(e) => handleInputChange('tldr', e.target.value)}
              placeholder="Too long; didn't read summary"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Featured Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageAlt">Image Alt Text</Label>
              <Input
                id="imageAlt"
                value={formData.imageAlt}
                onChange={(e) => handleInputChange('imageAlt', e.target.value)}
                placeholder="Image description"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isOnline"
                checked={formData.isOnline}
                onCheckedChange={(checked) => handleInputChange('isOnline', checked)}
              />
              <Label htmlFor="isOnline">Online</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isFavorite"
                checked={formData.isFavorite}
                onCheckedChange={(checked) => handleInputChange('isFavorite', checked)}
              />
              <Label htmlFor="isFavorite">Favorite</Label>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="introduction">Introduction</Label>
            <Textarea
              id="introduction"
              value={formData.introduction}
              onChange={(e) => handleInputChange('introduction', e.target.value)}
              placeholder="Article introduction"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              placeholder="Article summary"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content JSON</Label>
              {jsonErrors.content && (
                <span className="text-sm text-destructive">{jsonErrors.content}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="400px"
                language="json"
                theme="vs-dark"
                value={contentJson}
                onChange={(value) => {
                  setContentJson(value);
                  validateJSON('content', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Add paragraphs, sections, and custom content in JSON format
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>FAQs JSON</Label>
              {jsonErrors.faqs && (
                <span className="text-sm text-destructive">{jsonErrors.faqs}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={faqsJson}
                onChange={(value) => {
                  setFaqsJson(value);
                  validateJSON('faqs', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Recipe Data Tab */}
        <TabsContent value="recipe" className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipe JSON</Label>
              {jsonErrors.recipe && (
                <span className="text-sm text-destructive">{jsonErrors.recipe}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="500px"
                language="json"
                theme="vs-dark"
                value={recipeJson}
                onChange={(value) => {
                  setRecipeJson(value);
                  validateJSON('recipe', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Include ingredients, instructions, nutrition, prep time, etc.
            </p>
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title *</Label>
            <Input
              id="metaTitle"
              value={formData.metaTitle}
              onChange={(e) => handleInputChange('metaTitle', e.target.value)}
              placeholder="SEO title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description *</Label>
            <Textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={(e) => handleInputChange('metaDescription', e.target.value)}
              placeholder="SEO description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonicalUrl">Canonical URL</Label>
            <Input
              id="canonicalUrl"
              value={formData.canonicalUrl}
              onChange={(e) => handleInputChange('canonicalUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Keywords JSON</Label>
              {jsonErrors.keywords && (
                <span className="text-sm text-destructive">{jsonErrors.keywords}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="200px"
                language="json"
                theme="vs-dark"
                value={keywordsJson}
                onChange={(value) => {
                  setKeywordsJson(value);
                  validateJSON('keywords', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Published Date</Label>
            <Input
              id="publishedAt"
              type="datetime-local"
              value={formData.publishedAt}
              onChange={(e) => handleInputChange('publishedAt', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>References JSON</Label>
              {jsonErrors.references && (
                <span className="text-sm text-destructive">{jsonErrors.references}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={referencesJson}
                onChange={(value) => {
                  setReferencesJson(value);
                  validateJSON('references', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Media JSON</Label>
              {jsonErrors.media && (
                <span className="text-sm text-destructive">{jsonErrors.media}</span>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={mediaJson}
                onChange={(value) => {
                  setMediaJson(value);
                  validateJSON('media', value);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Add YouTube videos, galleries, and other media
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArticleEditor;

