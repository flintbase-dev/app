import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/15 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-muted",
        brand: "bg-brand-subtle text-brand-emphasis [a]:hover:bg-brand/15",
        info: "bg-info-bg text-info-dark [a]:hover:bg-info/15",
        success: "bg-success-bg text-success-dark [a]:hover:bg-success/15",
        warning: "bg-warning-bg text-warning-dark [a]:hover:bg-warning/15",
        destructive:
          "bg-danger-bg text-danger-dark focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:focus-visible:ring-destructive/40 [a]:hover:bg-danger/15",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        link: "text-brand underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
