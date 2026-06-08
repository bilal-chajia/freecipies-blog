import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/ui/card';

type LoadingVariant = 'page' | 'skeleton' | 'inline' | 'overlay' | 'dashboard' | 'table' | 'grid' | 'form' | 'editor';

interface LoadingStateProps {
  variant: LoadingVariant;
  message?: string;
  /** For skeleton/table/grid variants — number of placeholder rows/items */
  count?: number;
  /** For table variant — number of columns */
  columns?: number;
  className?: string;
}

/* ─── Inline spinner (button, small area) ─── */
const InlineLoading = ({ message }: { message?: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
    <Loader2 className="size-3.5 animate-spin" />
    {message}
  </span>
);

/* ─── Overlay backdrop (modal/panel blocking) ─── */
const OverlayLoading = ({ message }: { message?: string }) => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
    <Loader2 className="size-8 animate-spin text-primary" />
    {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}
  </div>
);

/* ─── Dashboard skeleton ─── */
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {['Chart A', 'Chart B'].map((label) => (
        <Card key={label} className="border-border/40">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Table skeleton ─── */
const TableSkeletonUI = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
    <div className="border rounded-lg overflow-hidden">
      <div className="flex gap-4 p-4 border-b bg-muted/30">
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
          {Array(columns).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

/* ─── Grid skeleton (cards, media) ─── */
const GridSkeletonUI = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <Card key={i} className="border-border/40">
          <Skeleton className="aspect-video w-full" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Form skeleton ─── */
const FormSkeletonUI = ({ fields = 4 }: { fields?: number }) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
    <Skeleton className="h-9 w-80" />
    <div className="space-y-4">
      {Array(fields).fill(0).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

/* ─── Editor skeleton ─── */
const EditorSkeletonUI = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
      <div className="space-y-4">
        <Card className="border-border/40">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

/* ─── Generic page skeleton wrapper ─── */
const PageSkeleton = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-in fade-in duration-300">
    {children}
  </div>
);

/* ═══════════════════════════════════════ */

export const LoadingState = ({
  variant,
  message,
  count,
  columns,
  className = '',
}: LoadingStateProps) => {
  switch (variant) {
    case 'inline':
      return <InlineLoading message={message} />;

    case 'overlay':
      return (
        <div className={`relative ${className}`}>
          <OverlayLoading message={message} />
        </div>
      );

    case 'dashboard':
      return (
        <PageSkeleton>
          <DashboardSkeleton />
        </PageSkeleton>
      );

    case 'table':
      return (
        <PageSkeleton>
          <TableSkeletonUI rows={count} columns={columns} />
        </PageSkeleton>
      );

    case 'grid':
      return (
        <PageSkeleton>
          <GridSkeletonUI count={count} />
        </PageSkeleton>
      );

    case 'form':
      return (
        <PageSkeleton>
          <FormSkeletonUI fields={count} />
        </PageSkeleton>
      );

    case 'editor':
      return (
        <PageSkeleton>
          <EditorSkeletonUI />
        </PageSkeleton>
      );

    case 'page':
    default:
      return (
        <PageSkeleton>
          <div className={`flex items-center justify-center py-24 ${className}`}>
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </PageSkeleton>
      );
  }
};

export default LoadingState;
