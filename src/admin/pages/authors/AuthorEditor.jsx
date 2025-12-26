import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/ui/button.jsx';
import { ArrowLeft } from 'lucide-react';
import { authorsAPI } from '../../services/api';
import { generateSlug } from '../../utils/helpers';
import MediaDialog from '../../components/MediaDialog';
import AuthorSidebar from '../../components/AuthorSidebar';
import AuthorEditorMain from '../../components/AuthorEditorMain';

const AuthorEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Media Dialog State  
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [activeImageType, setActiveImageType] = useState(null); // 'avatar' | 'cover' | 'banner'

  // Basic form data
  const [formData, setFormData] = useState({
    authorId: null, // Store ID for updates
    slug: '',
    name: '',
    email: '',
    jobTitle: '',
    shortDescription: '',
    excerpt: '',
    isOnline: false,
    isFeatured: false,
    sortOrder: 0,
    role: 'guest',
    isEditMode,
  });

  // JSON field states
  const [imagesData, setImagesData] = useState({ avatar: null, cover: null, banner: null });
  const [bioData, setBioData] = useState({
    headline: '',
    subtitle: '',
    introduction: '',
    fullBio: '{}',
    expertise: [],
    socialLinks: {},
  });
  const [seoData, setSeoData] = useState({
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
      const response = await authorsAPI.getBySlug(slug);
      const author = response.data?.data || response.data;

      if (author) {
        // Basic fields
        setFormData({
          authorId: author.id, // IMPORTANT: Store ID for updates
          slug: author.slug || '',
          name: author.name || '',
          email: author.email || '',
          jobTitle: author.jobTitle || author.job || '',
          shortDescription: author.shortDescription || '',
          excerpt: author.excerpt || '',
          isOnline: author.isOnline || false,
          isFeatured: author.isFeatured || false,
          sortOrder: author.sortOrder || 0,
          role: author.role || 'guest',
          isEditMode: true,
        });

        // Parse imagesJson
        try {
          const images = author.imagesJson ? JSON.parse(author.imagesJson) : {};
          setImagesData({
            avatar: images.avatar || null,
            cover: images.cover || null,
            banner: images.banner || null,
          });
        } catch {
          setImagesData({ avatar: null, cover: null, banner: null });
        }

        // Parse bioJson
        try {
          const bio = author.bioJson ? JSON.parse(author.bioJson) : {};
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

        // Parse seoJson
        try {
          const seo = author.seoJson ? JSON.parse(author.seoJson) : {};
          setSeoData({
            metaTitle: seo.metaTitle || author.metaTitle || '',
            metaDescription: seo.metaDescription || author.metaDescription || '',
            canonicalUrl: seo.canonicalUrl || '',
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
    } catch (err) {
      console.error('Failed to load author:', err);
      setError('Failed to load author');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from name for new authors
    if (field === 'name' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleImageChange = (type, imageData) => {
    setImagesData(prev => ({ ...prev, [type]: imageData }));
  };

  const handleImageRemove = (type) => {
    setImagesData(prev => ({ ...prev, [type]: null }));
  };

  const handleMediaDialogOpen = (type) => {
    setActiveImageType(type);
    setMediaDialogOpen(true);
  };

  const handleMediaSelect = (item) => {
    if (activeImageType) {
      handleImageChange(activeImageType, {
        url: item.url,
        alt: item.altText || formData.name,
        width: item.width,
        height: item.height,
      });
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
        jobTitle: formData.jobTitle,
        shortDescription: formData.shortDescription,
        excerpt: formData.excerpt,
        isOnline: formData.isOnline,
        isFeatured: formData.isFeatured,
        sortOrder: formData.sortOrder,
        role: formData.role,
        imagesJson: JSON.stringify(imagesData),
        bioJson: JSON.stringify(bioData),
        seoJson: JSON.stringify(seoData),
      };

      if (isEditMode) {
        // Use ID for updates
        await authorsAPI.update(formData.authorId, authorData);
      } else {
        await authorsAPI.create(authorData);
      }

      navigate('/authors', { state: { refresh: Date.now() } });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save author');
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
            <h2 className="text-2xl font-bold">
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
            onInputChange={handleInputChange}
            onSave={handleSave}
            saving={saving}
            isEditMode={isEditMode}
            imagesData={imagesData}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            onMediaDialogOpen={handleMediaDialogOpen}
            seoData={seoData}
            onSeoChange={setSeoData}
            socialLinks={bioData.socialLinks}
            onSocialChange={(links) => setBioData(prev => ({ ...prev, socialLinks: links }))}
          />
        </div>
      </div>

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default AuthorEditor;