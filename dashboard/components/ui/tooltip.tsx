import * as React from "react"

import { cn } from "@/lib/utils"

export interface TooltipProps {
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayDuration?: number
  className?: string
  children?: React.ReactNode
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, children, content, side = "top" }, ref) => {
    return (
      <div ref={ref} className={cn("group relative inline-flex", className)}>
        {children}
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-xs scale-0 rounded-md border border-[#222222] bg-[#141414] px-3 py-1.5 text-sm text-[#e0e0e0] shadow-md opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100",
            side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
            side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
            side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2"
          )}
        >
          {content}
        </div>
      </div>
    )
  }
)
Tooltip.displayName = "Tooltip"

// shadcn-compatible compound components for drop-in use
const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({
  children,
}) => {
  return <>{children}</>
}
TooltipProvider.displayName = "TooltipProvider"

interface TooltipRootContextValue {
  open: boolean
}

const TooltipRootContext = React.createContext<TooltipRootContextValue>({ open: false })

const TooltipRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}
TooltipRoot.displayName = "TooltipRoot"

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button ref={ref} type="button" className={cn(className)} {...props} />
))
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" | "left" | "right" }
>(({ className, side = "top", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#222222] bg-[#141414] px-3 py-1.5 text-sm text-[#e0e0e0] shadow-md",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent }
