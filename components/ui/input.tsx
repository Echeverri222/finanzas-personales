import * as React from "react"

import { cn } from "@/lib/utils"
import { alEditar, alInvalidar } from "@/lib/validacion"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onInvalid, onInput, ...props }, ref) => {
    return (
      <input
        type={type}
        // placeholder at /60: at full muted-foreground an example like "VOO" or
        // "700" read as a value already filled in.
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onInvalid={(e) => {
          alInvalidar(e)
          onInvalid?.(e)
        }}
        onInput={(e) => {
          alEditar(e)
          onInput?.(e)
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
