
import { cn } from "@/lib/utils";

export function ShortsIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12.13 8.32a3.38 3.38 0 0 0-3.26 4.34l3.26-4.34Z" />
            <path d="M16.57 5.05a3.38 3.38 0 0 0-4.34 3.27l4.34-3.27Z" />
            <path d="M7.43 18.95a3.38 3.38 0 0 0 4.34-3.27l-4.34 3.27Z" />
            <path d="m14 14-4 2" />
            <path d="M8.87 15.68a3.38 3.38 0 0 0 3.26-4.34l-3.26 4.34Z" />
            <path d="M17.66 11.98A3.38 3.38 0 0 0 16 7.43l-2 4.55" />
            <path d="M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
        </svg>
    )
}
