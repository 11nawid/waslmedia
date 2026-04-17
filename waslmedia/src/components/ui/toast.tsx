"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[440px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-4 overflow-hidden rounded-[1.35rem] border px-5 py-4 pr-11 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-3 data-[state=open]:sm:slide-in-from-bottom-3",
  {
    variants: {
      variant: {
        default:
          "border-black/5 bg-white/96 text-slate-900 dark:border-white/12 dark:bg-[#161b24]/96 dark:text-white dark:shadow-[0_20px_50px_rgba(2,6,23,0.55)]",
        destructive:
          "destructive group border-rose-200/70 bg-[rgba(255,245,245,0.96)] text-rose-950 dark:border-rose-400/25 dark:bg-[rgba(69,16,24,0.96)] dark:text-rose-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 px-3 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 dark:border-white/12 dark:bg-white/[0.08] dark:text-white/90 dark:hover:bg-white/[0.14] dark:focus:ring-white/20 group-[.destructive]:border-rose-200 group-[.destructive]:bg-white/70 group-[.destructive]:text-rose-700 group-[.destructive]:hover:bg-white dark:group-[.destructive]:border-rose-300/20 dark:group-[.destructive]:bg-white/[0.08] dark:group-[.destructive]:text-rose-50 dark:group-[.destructive]:hover:bg-white/[0.14]",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1 text-slate-400 opacity-0 transition-all hover:bg-black/5 hover:text-slate-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300 group-hover:opacity-100 dark:text-white/45 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus:ring-white/20 group-[.destructive]:text-rose-300 group-[.destructive]:hover:bg-rose-100/80 group-[.destructive]:hover:text-rose-600 dark:group-[.destructive]:text-rose-100/70 dark:group-[.destructive]:hover:bg-white/[0.08] dark:group-[.destructive]:hover:text-rose-50",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[15px] font-semibold tracking-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-6 text-slate-600 dark:text-white/72 group-[.destructive]:text-rose-700/90 dark:group-[.destructive]:text-rose-50/82", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
