import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FolderOpen,
  Users,
  Tags,
  Eye,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { statsAPI, articlesAPI } from '../../services/api';
import { formatNumber, formatRelativeTime } from '../../utils/helpers';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalRecipes: 0,
    totalCategories: 0,
    totalAuthors: 0,
    totalTags: 0,
    totalViews: 0,
  });
  const [recentArticles, setRecentArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats - handle API not existing yet
      try {
        const statsRes = await statsAPI.getDashboard();
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.log('Stats API not available yet, using defaults');
      }

      // Load recent articles - handle API not existing yet
      try {
        const articlesRes = await articlesAPI.getAll({
          limit: 5,
          sortBy: 'created_at',
          order: 'desc'
        });
        if (articlesRes.data) {
          setRecentArticles(Array.isArray(articlesRes.data) ? articlesRes.data : articlesRes.data.data || []);
        }
      } catch (error) {
        console.log('Articles API not available yet');
      }

      // Load popular articles - handle API not existing yet
      try {
        const popularRes = await statsAPI.getPopularArticles(5);
        if (popularRes.data) {
          setPopularArticles(Array.isArray(popularRes.data) ? popularRes.data : popularRes.data.data || []);
        }
      } catch (error) {
        console.log('Popular articles API not available yet');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      link: '/articles',
    },
    {
      title: 'Total Recipes',
      value: stats.totalRecipes,
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      link: '/articles?type=recipe',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FolderOpen,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      link: '/categories',
    },
    {
      title: 'Authors',
      value: stats.totalAuthors,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      link: '/authors',
    },
    {
      title: 'Tags',
      value: stats.totalTags,
      icon: Tags,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
      link: '/tags',
    },
    {
      title: 'Total Views',
      value: formatNumber(stats.totalViews),
      icon: Eye,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your content today.
          </p>
        </div>
        <Link to="/articles/new">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                {stat.link && (
                  <Link
                    to={stat.link}
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    View all →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent & Popular Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>Latest published content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No articles yet. Create your first one!
                </p>
              ) : (
                recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="block p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{article.label}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {article.categoryLabel}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(article.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Articles</CardTitle>
            <CardDescription>Most viewed content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No view data available yet.
                </p>
              ) : (
                popularArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="block p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{article.label}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatNumber(article.viewCount)} views
                          </span>
                        </div>
                      </div>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

