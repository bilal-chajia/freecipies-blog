import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input/50 placeholder:text-muted-foreground focus-visible:border-[#C7D2FE] focus-visible:ring-1 focus-visible:ring-[#C7D2FE] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-12 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props} />
  );
}

export { Textarea }
