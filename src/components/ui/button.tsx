import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Botón (ux/components.md): 48 px de alto, radio 12, un solo primary por pantalla,
 * loading conserva el ancho y anuncia aria-busy.
 */
export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold",
    "transition-colors duration-150 select-none",
    "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-text hover:bg-primary-hover shadow-soft",
        secondary: "border border-border bg-surface text-text hover:bg-surface-alt",
        ghost: "bg-transparent text-text hover:bg-surface-alt",
        link: "h-auto min-h-0 rounded-sm px-0 py-1 text-primary underline underline-offset-4 hover:text-primary-hover",
      },
      size: {
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-7 text-lg",
        sm: "min-h-11 px-4 text-sm",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, loading = false, disabled, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
            </span>
          ) : null}
        </>
      )}
    </Comp>
  );
});
