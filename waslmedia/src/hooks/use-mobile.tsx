
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1280

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on initial render, but ensure it runs only on the client
    if (typeof window !== 'undefined') {
        checkIsMobile();
    }

    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [])

  return isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsTablet = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }

    if (typeof window !== 'undefined') {
      checkIsTablet()
    }

    window.addEventListener("resize", checkIsTablet)
    return () => window.removeEventListener("resize", checkIsTablet)
  }, [])

  return isTablet
}
