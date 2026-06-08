import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  id,
  name,
  ...props
}: React.ComponentPropsWithoutRef<"textarea">) {
  const generatedId = React.useId();
  const textareaId = id ?? `textarea-${generatedId}`;
  const textareaName = name ?? textareaId;

  return (
    <textarea
      id={textareaId}
      name={textareaName}
      data-slot="textarea"
      className={cn(
        "border-input/50 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-12 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props} />
  );
}

export { Textarea }
