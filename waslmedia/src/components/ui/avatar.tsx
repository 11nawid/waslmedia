"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { resolveProtectedAssetUrl } from "@/lib/media/protected-assets-client"
import { Skeleton } from "@/components/ui/skeleton"

type AvatarLoadState = {
  hasImageSource: boolean
  imageLoaded: boolean
  imageFailed: boolean
  setHasImageSource: (value: boolean) => void
  setImageLoaded: (value: boolean) => void
  setImageFailed: (value: boolean) => void
}

const AvatarLoadContext = React.createContext<AvatarLoadState | null>(null)

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => {
  const [hasImageSource, setHasImageSource] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageFailed, setImageFailed] = React.useState(false)

  const contextValue = React.useMemo(
    () => ({
      hasImageSource,
      imageLoaded,
      imageFailed,
      setHasImageSource,
      setImageLoaded,
      setImageFailed,
    }),
    [hasImageSource, imageFailed, imageLoaded]
  )

  return (
    <AvatarLoadContext.Provider value={contextValue}>
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarLoadContext.Provider>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const avatarLoadContext = React.useContext(AvatarLoadContext)
  const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(typeof src === 'string' && src ? src : null)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const handleImageRef = React.useCallback(
    (node: HTMLImageElement | null) => {
      imageRef.current = node

      if (typeof ref === "function") {
        ref(node)
        return
      }

      if (ref) {
        ref.current = node
      }
    },
    [ref]
  )

  React.useEffect(() => {
    let active = true
    setIsLoaded(false)
    avatarLoadContext?.setImageLoaded(false)
    avatarLoadContext?.setImageFailed(false)

    if (typeof src !== 'string' || !src) {
      setResolvedSrc(null)
      avatarLoadContext?.setHasImageSource(false)
      return
    }

    avatarLoadContext?.setHasImageSource(true)
    setResolvedSrc(null)

    resolveProtectedAssetUrl(src)
      .then((nextSrc) => {
        if (active) {
          setResolvedSrc(nextSrc || src || null)
        }
      })
      .catch(() => {
        if (active) {
          setResolvedSrc(src || null)
        }
      })

    return () => {
      active = false
    }
  }, [avatarLoadContext, src])

  React.useEffect(() => {
    const image = imageRef.current
    if (!image || !resolvedSrc) {
      return
    }

    if (image.complete && image.naturalWidth > 0) {
      setIsLoaded(true)
      avatarLoadContext?.setImageLoaded(true)
    }
  }, [avatarLoadContext, resolvedSrc])

  return (
    <>
      {!isLoaded ? (
        <div className="absolute inset-0">
          <Skeleton className="h-full w-full rounded-full bg-muted/80" />
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-transparent via-background/20 to-transparent opacity-70" />
        </div>
      ) : null}
      <AvatarPrimitive.Image
        ref={handleImageRef}
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onLoad={() => {
          setIsLoaded(true)
          avatarLoadContext?.setImageLoaded(true)
        }}
        onError={() => {
          setIsLoaded(true)
          avatarLoadContext?.setImageFailed(true)
        }}
        className={cn(
          "aspect-square h-full w-full select-none transition-opacity duration-200",
          !isLoaded && "opacity-0",
          isLoaded && "opacity-100",
          className
        )}
        src={resolvedSrc || undefined}
        {...props}
      />
    </>
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  const avatarLoadContext = React.useContext(AvatarLoadContext)
  const hideFallback = Boolean(
    avatarLoadContext?.hasImageSource &&
    !avatarLoadContext.imageLoaded &&
    !avatarLoadContext.imageFailed
  )

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted transition-opacity duration-150",
        hideFallback && "opacity-0",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
