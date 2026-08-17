import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-secondary)] hover:text-white transition-all shadow-[0_0_15px_rgba(124,77,255,0.4)]",
                destructive: "bg-red-500 text-white hover:bg-red-500/90",
                outline: "border border-[var(--color-primary)] bg-transparent text-[var(--foreground)] hover:bg-[var(--color-primary)] hover:text-white hover:shadow-[0_0_15px_rgba(124,77,255,0.4)]",
                secondary: "bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/80",
                ghost: "hover:bg-white/10 hover:text-white",
                link: "text-primary underline-offset-4 hover:underline",
                glass: "glass hover:bg-white/10 text-white",
            },
            size: {
                default: "h-12 px-6 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-14 rounded-md px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
