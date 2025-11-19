import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthorsStore } from '../../store/useStore';
import { Button } from '@/components/ui/button.jsx';
import { ArrowLeft, Save } from 'lucide-react';

const AuthorEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { authors, setAuthors, setCurrentAuthor } = useAuthorsStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    slug: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isNewAuthor = slug === 'new';

  // Charger les données de l'auteur si ce n'est pas un nouvel auteur
  useEffect(() => {
    if (!isNewAuthor) {
      const author = authors.find(a => a.slug === slug);
      if (author) {
        setFormData({
          name: author.name,
          email: author.email,
          bio: author.bio,
          slug: author.slug
        });
        setCurrentAuthor(author);
      } else {
        setError('Auteur non trouvé');
      }
    }
  }, [slug, authors, isNewAuthor, setCurrentAuthor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: isNewAuthor ? generateSlug(value) : prev.slug
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validation simple
      if (!formData.name.trim()) {
        setError('Le nom est requis');
        setIsSubmitting(false);
        return;
      }

      if (!formData.email.trim()) {
        setError("L'email est requis");
        setIsSubmitting(false);
        return;
      }

      if (!formData.slug.trim()) {
        setError('Le slug est requis');
        setIsSubmitting(false);
        return;
      }

      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isNewAuthor) {
        // Créer un nouvel auteur
        const newAuthor = {
          ...formData
        };
        setAuthors([...authors, newAuthor]);
      } else {
        // Mettre à jour l'auteur existant
        const updatedAuthors = authors.map(author =>
          author.slug === slug 
            ? { ...author, ...formData }
            : author
        );
        setAuthors(updatedAuthors);
      }

      // Rediriger vers la liste des auteurs
      navigate('/authors');
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !formData.name && !isNewAuthor) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>{error}</p>
        <Link to="/authors" className="mt-2 inline-block">
          <Button variant="outline">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/authors">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">
          {isNewAuthor ? 'Add New Author' : 'Edit Author'}
        </h1>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border border-border">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={formData.name}
            onChange={handleNameChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={formData.slug}
            onChange={handleChange}
            required
            disabled={!isNewAuthor}
          />
          {!isNewAuthor && (
            <p className="text-xs text-muted-foreground">
              Le slug ne peut pas être modifié après la création.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={6}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={formData.bio}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Link to="/authors">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNewAuthor ? 'Create Author' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AuthorEditor;