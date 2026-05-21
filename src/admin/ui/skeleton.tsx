import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent/50 skeleton-shimmer rounded-md", className)}
      {...props} />
  );
}

export { Skeleton }
