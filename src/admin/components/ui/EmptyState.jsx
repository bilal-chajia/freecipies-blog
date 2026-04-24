import { FileText, Search, FolderOpen, Users, Image, Settings, Pin, AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/ui/button";
import { Link } from "react-router-dom";

const iconMap = {
  articles: FileText,
  recipes: FileText,
  roundups: FileText,
  categories: FolderOpen,
  authors: Users,
  media: Image,
  settings: Settings,
  pinterest: Pin,
  search: Search,
  alert: AlertCircle,
  default: Inbox,
};

export function EmptyState({
  icon = "default",
  title = "No data found",
  description = "There are no items to display at the moment.",
  actionLabel,
  actionHref,
  onAction,
  children,
}) {
  const Icon = iconMap[icon] || iconMap.default;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>
      {(actionLabel || children) && (
        <div className="mt-5 flex items-center gap-3">
          {actionLabel && actionHref && (
            <Link to={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </Link>
          )}
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>{actionLabel}</Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
