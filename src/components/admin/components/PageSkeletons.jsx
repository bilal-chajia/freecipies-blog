import React from 'react';
import { Skeleton } from '@/ui/skeleton.jsx';
import { Card, CardContent, CardHeader } from '@/ui/card.jsx';

// Dashboard skeleton with stats cards and charts
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Stats Grid */}
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

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  </div>
);

// Table skeleton for lists (Articles, Categories, etc.)
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-4">
    {/* Header with search and filters */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>

    {/* Table */}
    <div className="border rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="flex gap-4 p-4 border-b bg-muted/30">
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table rows */}
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
          {Array(columns).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>

    {/* Pagination */}
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

// Grid skeleton for cards (Categories, Media)
export const GridSkeleton = ({ count = 8 }) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Grid */}
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

// Form skeleton for settings and editors
export const FormSkeleton = ({ fields = 4 }) => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Tabs */}
    <Skeleton className="h-9 w-80" />

    {/* Form fields */}
    <div className="space-y-4">
      {Array(fields).fill(0).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex gap-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

// Editor skeleton for article/category editors
export const EditorSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
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

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor area */}
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>

      {/* Sidebar */}
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

// Generic page skeleton
export const PageSkeleton = ({ children }) => (
  <div className="animate-in fade-in duration-300">
    {children}
  </div>
);

export default {
  DashboardSkeleton,
  TableSkeleton,
  GridSkeleton,
  FormSkeleton,
  EditorSkeleton,
  PageSkeleton,
};
