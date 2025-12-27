import ContentListBase from '../../components/shared/ContentListBase';
import { FileText } from 'lucide-react';

const ArticlesList = () => {
  return (
    <ContentListBase
      contentType="article"
      title="Blog Posts"
      description="Manage your latest blog posts, news, and updates."
      newButtonLabel="New Article"
      newButtonPath="/articles/new"
      editPathPrefix="/articles/edit"
      livePathPrefix="/articles"
      typeIcon={FileText}
      statsLabel="Total Articles"
    />
  );
};

export default ArticlesList;
