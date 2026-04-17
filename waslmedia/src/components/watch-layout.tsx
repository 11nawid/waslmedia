
'use client';

import { useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";


export function WatchLayout({ children }: { children: React.ReactNode }) {
    const { setCollapsed, isCollapsed } = useSidebar();

    useEffect(() => {
        setCollapsed(true);
        // Return to default state when leaving the page
        return () => setCollapsed(false);
    }, [setCollapsed]);
    
    return (
       <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className={cn("flex-1 overflow-y-auto no-scrollbar")}>
                    {children}
                </main>
            </div>
        </div>
    )
}
