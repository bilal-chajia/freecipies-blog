import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FolderOpen,
  Users,
  Tags,
  Eye,
  TrendingUp,
  Plus,
  ArrowUpRight,
  UtensilsCrossed,
  ChefHat,
  LayoutDashboard,
  Calendar,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Button } from '@/ui/button.jsx';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/ui/card.jsx';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/ui/chart.jsx';
import { statsAPI, articlesAPI } from '../../services/api';
import { formatNumber, formatRelativeTime, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../store/useStore';

// Mock data for the chart
const chartData = [
  { month: "Jan", articles: 45, views: 2400 },
  { month: "Feb", articles: 52, views: 3200 },
  { month: "Mar", articles: 48, views: 2800 },
  { month: "Apr", articles: 61, views: 4100 },
  { month: "May", articles: 55, views: 3900 },
  { month: "Jun", articles: 67, views: 5200 },
  { month: "Jul", articles: 72, views: 6100 },
];

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--primary))",
  },
  articles: {
    label: "Articles",
    color: "hsl(var(--secondary))",
  },
};

const Dashboard = () => {
  const { user } = useAuthStore();
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

      // Load stats
      try {
        const statsRes = await statsAPI.getDashboard();
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.log('Stats API not available yet');
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
        console.log('Articles API not available yet');
      }

      // Load popular articles
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
      trend: '+12%',
      trendUp: true,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/articles',
    },
    {
      title: 'Recipes',
      value: stats.totalRecipes,
      icon: UtensilsCrossed,
      trend: '+5%',
      trendUp: true,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      link: '/articles?type=recipe',
    },
    {
      title: 'Total Views',
      value: formatNumber(stats.totalViews),
      icon: Eye,
      trend: '+24%',
      trendUp: true,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Authors',
      value: stats.totalAuthors,
      icon: Users,
      trend: 'Static',
      trendUp: null,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      link: '/authors',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 w-full bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Premium Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(new Date(), 'EEEE, MMMM do')}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-primary">{user?.name || 'Admin'}</span>!
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Your content performance is looking strong. You've reached <span className="font-semibold text-foreground">{formatNumber(stats.totalViews)}</span> total views this month.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/articles/new">
              <Button size="lg" className="h-12 px-6 gap-2 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-5 w-5" />
                Create Content
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border-none shadow-md ring-1 ring-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {stat.trendUp !== null && (
                  <span className={stat.trendUp ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                    {stat.trend}
                  </span>
                )}
                {stat.trendUp === null && <span>{stat.trend}</span>}
                <span>from last month</span>
              </p>
            </CardContent>
            {stat.link && (
              <Link to={stat.link} className="absolute inset-x-0 bottom-0 h-1 bg-primary/20 hover:bg-primary transition-colors" />
            )}
          </Card>
        ))}
      </div>

      {/* Chart Section & Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="flex flex-col gap-1 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Performance Overview</CardTitle>
                <CardDescription>Views and content growth over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">+24% Growth</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full pt-4">
              <AreaChart
                data={chartData}
                margin={{
                  left: -20,
                  right: 12,
                }}
              >
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-views)"
                      stopOpacity={0.3}
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
                  className="text-muted-foreground font-medium"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground font-medium"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="views"
                  type="monotone"
                  fill="url(#fillViews)"
                  stroke="var(--color-views)"
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
            <div className="flex gap-2 font-medium leading-none">
              Content views increased by 15.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Showing total views for the last 7 months
            </div>
          </CardFooter>
        </Card>

        {/* Popular Content */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Popular Content</CardTitle>
              <CardDescription>Highest performing articles</CardDescription>
            </div>
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {popularArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3 opacity-50">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm">No performance data yet</p>
                </div>
              ) : (
                popularArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="group block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/50 text-sm font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {article.label}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {formatNumber(article.viewCount)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-xs text-muted-foreground">
                            {article.categoryLabel}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link to="/articles" className="w-full">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary text-xs h-8">
                View detailed analytics
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Secondary Grid (Recent + Tasks/Notes?) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Content Activity</CardTitle>
              <CardDescription>Latest updates to your blog and recipes</CardDescription>
            </div>
            <Link to="/articles">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="pb-3 text-left font-medium">Article</th>
                    <th className="pb-3 text-left font-medium hidden sm:table-cell">Category</th>
                    <th className="pb-3 text-left font-medium hidden md:table-cell">Status</th>
                    <th className="pb-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentArticles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : (
                    recentArticles.map((article) => (
                      <tr key={article.id} className="group hover:bg-accent/50 transition-colors">
                        <td className="py-3 pr-4">
                          <Link to={`/articles/edit/${article.id}`} className="font-medium hover:text-primary transition-colors block truncate max-w-[200px] sm:max-w-md">
                            {article.label}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 hidden sm:table-cell">
                          <span className="px-2 py-0.5 rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                            {article.categoryLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                           <div className="flex items-center gap-1.5">
                             <div className={`h-1.5 w-1.5 rounded-full ${article.status === 'online' ? 'bg-green-500' : 'bg-orange-500'}`} />
                             <span className="capitalize text-xs">{article.status}</span>
                           </div>
                        </td>
                        <td className="py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                          {formatRelativeTime(article.createdAt)}
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

