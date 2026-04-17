
'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { useLiveCounterStore } from '@/hooks/use-live-counter-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { LiveSubscriberCounter } from './live-subscriber-counter';

export function LiveCounterModal() {
    const isMobile = useIsMobile();
    const { isOpen, onClose } = useLiveCounterStore();

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                         <DrawerTitle>Live Subscriber Count</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4">
                        {isOpen ? <LiveSubscriberCounter /> : null}
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle>Live Subscriber Count</DialogTitle>
                </DialogHeader>
                {isOpen ? <LiveSubscriberCounter /> : null}
            </DialogContent>
        </Dialog>
    )
}
