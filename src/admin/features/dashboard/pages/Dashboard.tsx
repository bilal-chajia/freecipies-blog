import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  Eye,
  TrendingUp,
  Plus,
  ArrowUpRight,
  UtensilsCrossed,
  Calendar,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from '@/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/ui/card';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from '@/ui/chart';
import { statsAPI, articlesAPI } from '../../../services/api';
import { formatNumber, formatRelativeTime, formatDate } from '../../../utils/helpers';
import { useAuthStore } from '../../../store/useStore';
import { toast } from 'sonner';

interface DashboardStats {
  totalArticles: number;
  totalRecipes: number;
  totalCategories: number;
  totalAuthors: number;
  totalTags: number;
  totalViews: number;
}

interface ArticleSummary {
  id: string | number;
  slug: string;
  label: string;
  categoryLabel?: string;
  status?: string;
  view_count?: number;
  created_at?: string;
}

interface ChartDataPoint {
  month: string;
  articles: number;
  views: number;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean | null;
  link?: string;
}

const chartConfig = {
  articles: {
    label: "Articles",
    color: "hsl(var(--primary))",
  },
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalRecipes: 0,
    totalCategories: 0,
    totalAuthors: 0,
    totalTags: 0,
    totalViews: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [trends, setTrends] = useState<{
    articles: string | null;
    recipes: string | null;
    views: string | null;
    authors: string | null;
  } | null>(null);
  const [recentArticles, setRecentArticles] = useState<ArticleSummary[]>([]);
  const [popularArticles, setPopularArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      try {
        const statsRes = await statsAPI.getDashboard();
        if (statsRes.data) {
          const d = statsRes.data;
          setStats({
            totalArticles: d.total_articles ?? 0,
            totalRecipes: d.total_recipes ?? 0,
            totalCategories: d.total_categories ?? 0,
            totalAuthors: d.total_authors ?? 0,
            totalTags: d.total_tags ?? 0,
            totalViews: d.total_views ?? 0,
          });
          if (d.articles_over_time) {
            setChartData(d.articles_over_time);
          }
          if (d.trends) {
            setTrends(d.trends);
          }
        }
      } catch (error) {
        // Silently fail; empty state is handled below
      }

      // Load recent articles
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
      }

      // Load popular articles
      try {
        const popularRes = await statsAPI.getPopularArticles(5);
        if (popularRes.data) {
          setPopularArticles(Array.isArray(popularRes.data) ? popularRes.data : popularRes.data.data || []);
        }
      } catch (error) {
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Articles',
      value: stats.totalArticles,
      icon: FileText,
      trend: trends?.articles ?? '—',
      trendUp: trends?.articles ? trends.articles.startsWith('+') : null,
      link: '/articles',
    },
    {
      title: 'Recipes',
      value: stats.totalRecipes,
      icon: UtensilsCrossed,
      trend: trends?.recipes ?? '—',
      trendUp: trends?.recipes ? trends.recipes.startsWith('+') : null,
      link: '/articles?type=recipe',
    },
    {
      title: 'Total Views',
      value: formatNumber(stats.totalViews),
      icon: Eye,
      trend: trends?.views ?? '—',
      trendUp: trends?.views ? trends.views.startsWith('+') : null,
    },
    {
      title: 'Authors',
      value: stats.totalAuthors,
      icon: Users,
      trend: trends?.authors ?? '—',
      trendUp: trends?.authors ? trends.authors.startsWith('+') : null,
      link: '/authors',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 w-full bg-muted rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 bg-muted rounded-lg" />
          <div className="h-80 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard space-y-4 pb-6">
      {/* Dashboard command header */}
      <div className="relative overflow-hidden rounded-lg border border-border/80 bg-card p-4 shadow-xs">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.04))]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Calendar className="size-3.5" />
              <span>{formatDate(new Date(), 'EEEE, MMMM do')}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-balance">
              Welcome back, <span className="text-primary">{user?.name || 'Admin'}</span>
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              {stats.totalViews === 0 ? (
                "Start creating content to track your performance."
              ) : (
                <>Your content performance is looking strong. You've reached <span className="font-semibold text-foreground">{formatNumber(stats.totalViews)}</span> total views this month.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/articles/new">
              <Button size="sm" className="h-9 rounded-lg px-4 gap-1.5 shadow-xs transition-all duration-200">
                <Plus className="size-3.5" />
                Create Content
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs hover:border-border hover:bg-accent/5 transition-all duration-200 group">
            <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1 space-y-0">
              <CardTitle className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">{stat.title}</CardTitle>
              <div className="size-7 bg-muted/40 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors duration-200">
                <stat.icon className="size-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                {stat.trendUp !== null && (
                  <span className={stat.trendUp ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {stat.trend}
                  </span>
                )}
                {stat.trendUp === null && <span>{stat.trend}</span>}
                <span>from last month</span>
              </p>
            </CardContent>
            {stat.link && (
              <Link to={stat.link} className="absolute inset-0 z-10" aria-label={`Go to ${stat.title}`} />
            )}
          </Card>
        ))}
      </div>

      {/* Chart Section & Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth Chart */}
        <Card className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-xs">
          <CardHeader className="flex flex-col gap-1 p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Performance Overview</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Views and content growth over time</CardDescription>
              </div>
              <div>
                {stats.totalViews > 0 && (
                  <div className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                    <TrendingUp className="size-3" />
                    <span>+24% Growth</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart
                data={chartData}
                margin={{
                  left: -20,
                  right: 12,
                  top: 10,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-views)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-views)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[10px] text-muted-foreground/80 font-bold"
                />
                <YAxis
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                  className="text-[10px] text-muted-foreground/80 font-bold"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="articles"
                  type="monotone"
                  fill="url(#fillViews)"
                  stroke="var(--color-articles)"
                  strokeWidth={2}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-row items-center justify-between text-xs border-t border-border/50 p-3 bg-muted/10 rounded-b-lg">
            <div className="flex items-center gap-1 font-semibold text-foreground/90">
              {stats.totalViews > 0 ? (
                <>
                  Content views increased this month <TrendingUp className="size-3.5 text-success" />
                </>
              ) : (
                "Start publishing to see growth metrics"
              )}
            </div>
            <div className="text-muted-foreground">
              Showing articles published over the last 6 months
            </div>
          </CardFooter>
        </Card>

        {/* Popular Content */}
        <Card className="rounded-lg border border-border/80 bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <div>
              <CardTitle className="text-sm font-bold">Popular Content</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Highest performing articles</CardDescription>
            </div>
            <UtensilsCrossed className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <div className="space-y-2.5">
              {popularArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 opacity-40">
                  <FileText className="size-8 text-muted-foreground" />
                  <p className="text-xs">No performance data yet</p>
                </div>
              ) : (
                popularArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="group block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-[10px] font-bold text-muted-foreground transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                          {article.label}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <Eye className="size-2.5" />
                            {formatNumber(article.view_count)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span>
                            {article.categoryLabel}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="size-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter className="p-3 pt-0 border-t border-border/40 mt-auto bg-muted/5 rounded-b-lg">
            <Link to="/articles" className="w-full">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary text-[11px] h-7 font-bold">
                View detailed analytics
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Secondary Grid (Recent Activity) */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="rounded-lg border border-border/80 bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <div>
              <CardTitle className="text-sm font-bold">Recent Content Activity</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Latest updates to your blog and recipes</CardDescription>
            </div>
            <Link to="/articles">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs rounded-md shadow-xs border border-border/80 bg-card">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-2 px-3 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Article</th>
                    <th className="pb-2 px-3 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="pb-2 px-3 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="pb-2 px-3 text-right text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentArticles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : (
                    recentArticles.map((article) => (
                      <tr key={article.id} className="group hover:bg-accent/40 transition-colors">
                        <td className="py-2.5 px-3 text-xs">
                          <Link to={`/articles/edit/${article.id}`} className="font-semibold hover:text-primary transition-colors block truncate max-w-[200px] sm:max-w-md">
                            {article.label}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-muted/80 text-[9px] font-bold text-muted-foreground border border-border/40 uppercase tracking-wider">
                            {article.categoryLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell text-xs">
                           <div className="flex items-center gap-1.5">
                             <div className={`size-1.5 rounded-full ${article.status === 'online' ? 'bg-green-500' : 'bg-amber-500'}`} />
                             <span className="capitalize text-[11px] font-medium">{article.status}</span>
                           </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                          {formatRelativeTime(article.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
