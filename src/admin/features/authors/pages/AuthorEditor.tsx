import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/ui/button';
import { ArrowLeft } from 'lucide-react';
import { authorsAPI } from '../../../services/api';
import { buildImageSlotFromMedia, generateSlug } from '../../../utils/helpers';
import { MediaDialog } from '@admin/features/media/components';
import AuthorSidebar from '@admin/features/authors/components/AuthorSidebar';
import AuthorEditorMain from '@admin/features/authors/components/AuthorEditorMain';
import { toast } from 'sonner';
import type { LegacyBioFields } from '@modules/authors/types/authors.types';

const AVATAR_VARIANT_SIZES = {
  lg: 400,
  md: 200,
  sm: 100,
  xs: 50,
};

interface FormData {
  author_id: number | null;
  slug: string;
  name: string;
  email: string;
  job_title: string;
  short_description: string;
  workflow_status: string;
  is_featured: boolean;
  sort_order: number;
  role: string;
  isEditMode: boolean;
}

interface SeoData {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  keywords: string[];
}

const AuthorEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Media Dialog State
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [activeImageType, setActiveImageType] = useState<'avatar' | 'hero' | null>(null);

  // Basic form data
  const [formData, setFormData] = useState<FormData>({
    author_id: null,
    slug: '',
    name: '',
    email: '',
    job_title: '',
    short_description: '',
    workflow_status: 'draft',
    is_featured: false,
    sort_order: 0,
    role: 'guest',
    isEditMode,
  });

  // JSON field states
  const [imagesData, setImagesData] = useState<Record<string, unknown>>({ avatar: null, hero: null });
  const [bioData, setBioData] = useState<LegacyBioFields>({
    headline: '',
    subtitle: '',
    introduction: '',
    fullBio: '{}',
    expertise: [],
    socialLinks: {},
  });
  const [seoData, setSeoData] = useState<SeoData>({
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    keywords: [],
  });

  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (isEditMode && !isLoadingRef.current) {
      loadAuthor();
    }
  }, [slug]);

  const loadAuthor = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await authorsAPI.getBySlug(slug!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const author = (response.data as any)?.data || (response.data as any);

      if (author) {
        // Basic fields
        setFormData({
          author_id: author.id,
          slug: author.slug || '',
          name: author.name || '',
          email: author.email || '',
          job_title: author.job_title || author.job || '',
          short_description: author.short_description || '',
          workflow_status: author.workflow_status || 'draft',
          is_featured: author.is_featured || false,
          sort_order: author.sort_order || 0,
          role: author.role || 'guest',
          isEditMode: true,
        });

        // Parse images_json
        try {
          const images = author.images_json ? JSON.parse(author.images_json) : {};
          setImagesData({
            avatar: images.avatar || null,
            hero: images.hero || null,
          });
        } catch {
          setImagesData({ avatar: null, hero: null });
        }

        // Parse bio_json
        try {
          const bio = author.bio_json ? JSON.parse(author.bio_json) : {};
          setBioData({
            headline: bio.headline || '',
            subtitle: bio.subtitle || '',
            introduction: bio.introduction || '',
            fullBio: bio.fullBio || '{}',
            expertise: bio.expertise || [],
            socialLinks: bio.socialLinks || {},
          });
        } catch {
          setBioData({
            headline: '',
            subtitle: '',
            introduction: '',
            fullBio: '{}',
            expertise: [],
            socialLinks: {},
          });
        }

        // Parse seo_json
        try {
          const seo = author.seo_json ? JSON.parse(author.seo_json) : {};
          setSeoData({
            metaTitle: seo.meta_title || seo.metaTitle || author.metaTitle || '',
            metaDescription: seo.meta_description || seo.metaDescription || author.metaDescription || '',
            canonicalUrl: seo.canonical || seo.canonicalUrl || '',
            keywords: seo.keywords || [],
          });
        } catch {
          setSeoData({
            metaTitle: author.metaTitle || '',
            metaDescription: author.metaDescription || '',
            canonicalUrl: '',
            keywords: [],
          });
        }
      } else {
        setError('Author not found');
      }
    } catch {
      toast.error('Failed to load author');
      setError('Failed to load author');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from name for new authors
    if (field === 'name' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value as string) }));
    }
  };

  const handleImageChange = (type: string, imageData: unknown) => {
    const slot = type === 'hero' ? 'hero' : type;
    setImagesData(prev => ({ ...prev, [slot]: imageData }));
  };

  const handleImageRemove = (type: string) => {
    const slot = type === 'hero' ? 'hero' : type;
    setImagesData(prev => ({ ...prev, [slot]: null }));
  };

  const handleMediaDialogOpen = (type: 'avatar' | 'hero') => {
    setActiveImageType(type);
    setMediaDialogOpen(true);
  };

  const handleMediaSelect = (item: unknown) => {
    if (activeImageType) {
      const slot = buildImageSlotFromMedia(item as Parameters<typeof buildImageSlotFromMedia>[0], {
        alt: formData.name || '',
        variant_keys: activeImageType === 'hero' ? ['sm', 'md', 'lg'] : ['xs', 'sm'],
      });
      handleImageChange(activeImageType, slot);
    }
    setMediaDialogOpen(false);
    setActiveImageType(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate required fields
      if (!formData.name || !formData.slug || !formData.email) {
        setError('Name, slug, and email are required');
        setSaving(false);
        return;
      }

      // Prepare data with JSON fields
      const authorData = {
        name: formData.name,
        email: formData.email,
        slug: formData.slug,
        job_title: formData.job_title,
        short_description: formData.short_description,
        workflow_status: formData.workflow_status,
        is_featured: formData.is_featured,
        sort_order: formData.sort_order,
        role: formData.role,
        images_json: JSON.stringify(imagesData),
        bio_json: JSON.stringify(bioData),
        seo_json: JSON.stringify(seoData),
      };

      if (isEditMode && formData.author_id) {
        await authorsAPI.update(formData.author_id, authorData);
      } else {
        await authorsAPI.create(authorData);
      }

      navigate('/authors', { state: { refresh: Date.now() } });
    } catch (err: unknown) {
      toast.error('Failed to save author');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).response?.data?.error || 'Failed to save author');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-86">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !formData.name && isEditMode) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>{error}</p>
        <Link to="/authors" className="mt-2 inline-block">
          <Button variant="outline">Back to Authors</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Link to="/authors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-balance">
              {isEditMode ? 'Edit Author' : 'New Author'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? formData.name || 'Untitled' : 'Create a new author profile'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/authors')}>
            Cancel
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* Main Layout: 2 columns */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Main Content Area */}
        <div className="col-span-8 overflow-y-auto border-r">
          <AuthorEditorMain
            formData={formData}
            onInputChange={handleInputChange}
            bioData={bioData}
            onBioChange={setBioData}
          />
        </div>

        {/* Sidebar */}
        <div className="col-span-4 overflow-y-auto bg-muted/30">
          <AuthorSidebar
            formData={formData}
            onInputChange={(field: string, value: unknown) => handleInputChange(field as keyof FormData, value)}
            onSave={handleSave}
            saving={saving}
            isEditMode={isEditMode}
            imagesData={imagesData}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            onMediaDialogOpen={(type: string) => handleMediaDialogOpen(type as 'avatar' | 'hero')}
            seoData={seoData}
            onSeoChange={(data) => setSeoData(prev => ({ ...prev, ...data }))}
            socialLinks={bioData.socialLinks || {}}
            onSocialChange={(links) => setBioData(prev => ({ ...prev, socialLinks: links }))}
          />
        </div>
      </div>

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        onSelect={handleMediaSelect}
        variantSizes={activeImageType === 'avatar' ? AVATAR_VARIANT_SIZES : undefined}
      />
    </div>
  );
};

export default AuthorEditor;
