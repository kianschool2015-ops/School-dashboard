import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md",
        navy:
          "bg-[#004071] text-white shadow hover:bg-[#003259] active:bg-[#002645] focus-visible:ring-[#004071]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border-2 border-input bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        emerald:
          "bg-emerald-600 text-white shadow hover:bg-emerald-700 focus-visible:ring-emerald-500",
        amber:
          "bg-amber-600 text-white shadow hover:bg-amber-700 focus-visible:ring-amber-500",
        rose:
          "bg-rose-600 text-white shadow hover:bg-rose-700 focus-visible:ring-rose-500",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-sm sm:text-base",
        sm: "h-9 rounded-md px-3.5 text-xs",
        lg: "h-13 rounded-xl px-8 text-base sm:text-lg font-semibold",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
