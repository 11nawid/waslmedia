import { cn } from "@/lib/utils";
import Image from "next/image";
import { appConfig } from "@/config/app";

export function WaslmediaLogo({ className }: { className?: string }) {
    return (
        <Image
            src={appConfig.brandLogoUrl}
            alt={`${appConfig.appName} logo`}
            width={28}
            height={28}
            className={cn("shrink-0 object-contain", className)}
        />
    )
}
