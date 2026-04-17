import { cn } from "@/lib/utils";

export function YouTubeLogo({ className }: { className?: string }) {
    return (
        <svg
            className={cn("text-red-600", className)}
            viewBox="0 0 28 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M27.52 3.03C27.19 1.84 26.22 0.86 25.05 0.54C22.86 0 14 0 14 0C14 0 5.14 0 2.95 0.54C1.78 0.86 0.81 1.84 0.48 3.03C0 5.2 0 10 0 10C0 10 0 14.8 0.48 16.97C0.81 18.16 1.78 19.14 2.95 19.46C5.14 20 14 20 14 20C14 20 22.86 20 25.05 19.46C26.22 19.14 27.19 18.16 27.52 16.97C28 14.8 28 10 28 10C28 10 28 5.2 27.52 3.03Z" />
            <path d="M11.2 14.29V5.71L18.47 10L11.2 14.29Z" fill="white" />
        </svg>
    )
}
