import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Three-way theme control: light / dark / follow the OS.
 *
 * A plain light-dark switch cannot express "follow the system", which is the
 * default -- so a toggle would have silently pinned the theme the first time it
 * was touched, with no way back.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // The server has no idea which theme will win -- it depends on localStorage
  // and prefers-color-scheme, both client-only. Rendering a sun-or-moon from
  // `theme` during SSR is therefore a guaranteed hydration mismatch, so hold a
  // neutral, correctly-sized placeholder until after mount.
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-hidden
        tabIndex={-1}
      >
        <Sun className="opacity-0" />
      </Button>
    );
  }

  const Icon = resolvedTheme === "dark" ? Moon : Sun;
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={`Tema: ${current.label}. Cambiar tema`}
        >
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            // Radix menu items are not radios, so expose the current choice to
            // assistive tech rather than relying on the checkmark alone.
            aria-current={theme === value}
            className="gap-2"
          >
            <OptionIcon className="text-muted-foreground" />
            {label}
            {theme === value ? (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
