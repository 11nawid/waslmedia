

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';

type UploadDate = 'anytime' | 'lasthour' | 'today' | 'thisweek' | 'thismonth' | 'thisyear';
type ResultType = 'all' | 'video' | 'channel' | 'playlist' | 'film';
type Duration = 'any' | 'short' | 'medium' | 'long';
type SortBy = 'relevance' | 'uploaddate' | 'viewcount' | 'rating';

export interface SearchFilters {
    uploadDate: UploadDate;
    type: ResultType;
    duration: Duration;
    sortBy: SortBy;
}

interface SearchFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentFilters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}

const filterSections = {
    'UPLOAD DATE': [
        { label: 'Anytime', value: 'anytime' },
        { label: 'Last hour', value: 'lasthour' },
        { label: 'Today', value: 'today' },
        { label: 'This week', value: 'thisweek' },
        { label: 'This month', value: 'thismonth' },
        { label: 'This year', value: 'thisyear' },
    ],
    'TYPE': [
        { label: 'All', value: 'all' },
        { label: 'Video', value: 'video' },
        { label: 'Channel', value: 'channel' },
        { label: 'Playlist', value: 'playlist' },
        { label: 'Film', value: 'film' },
    ],
    'DURATION': [
        { label: 'Any', value: 'any' },
        { label: 'Under 4 minutes', value: 'short' },
        { label: '4-20 minutes', value: 'medium' },
        { label: 'Over 20 minutes', value: 'long' },
    ],
    'SORT BY': [
        { label: 'Relevance', value: 'relevance' },
        { label: 'Upload date', value: 'uploaddate' },
        { label: 'View count', value: 'viewcount' },
        { label: 'Rating', value: 'rating' },
    ],
};

function FilterContent({ localFilters, handleFilterClick }: { localFilters: SearchFilters, handleFilterClick: (section: keyof SearchFilters, value: any) => void }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
            <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground">UPLOAD DATE</h3>
                <Separator />
                {filterSections['UPLOAD DATE'].map(item => (
                     <Button key={item.value} variant="ghost" onClick={() => handleFilterClick('uploadDate', item.value as UploadDate)} className={`w-full justify-start ${localFilters.uploadDate === item.value && 'bg-secondary font-bold text-foreground'}`}>{item.label}</Button>
                ))}
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground">TYPE</h3>
                 <Separator />
                {filterSections['TYPE'].map(item => (
                    <Button key={item.value} variant="ghost" onClick={() => handleFilterClick('type', item.value as ResultType)} className={`w-full justify-start ${localFilters.type === item.value && 'bg-secondary font-bold text-foreground'}`}>{item.label}</Button>
                ))}
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground">DURATION</h3>
                <Separator />
                {filterSections['DURATION'].map(item => (
                    <Button key={item.value} variant="ghost" onClick={() => handleFilterClick('duration', item.value as Duration)} className={`w-full justify-start ${localFilters.duration === item.value && 'bg-secondary font-bold text-foreground'}`}>{item.label}</Button>
                ))}
            </div>
             <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground">SORT BY</h3>
                <Separator />
                {filterSections['SORT BY'].map(item => (
                    <Button key={item.value} variant="ghost" onClick={() => handleFilterClick('sortBy', item.value as SortBy)} className={`w-full justify-start ${localFilters.sortBy === item.value && 'bg-secondary font-bold text-foreground'}`}>{item.label}</Button>
                ))}
            </div>
        </div>
    )
}


export function SearchFilterDialog({ isOpen, onOpenChange, currentFilters, onApply }: SearchFilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(currentFilters);
  const isMobile = useIsMobile();

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleFilterClick = (section: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({...prev, [section]: value }));
  };
  
  if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent>
                 <DrawerHeader>
                    <DrawerTitle>Search filters</DrawerTitle>
                </DrawerHeader>
                <ScrollArea className="h-72">
                    <div className="p-4">
                        <FilterContent localFilters={localFilters} handleFilterClick={handleFilterClick} />
                    </div>
                </ScrollArea>
                <div className="p-4 border-t">
                    <Button variant="primary" onClick={handleApply} className="w-full">Show results</Button>
                </div>
            </DrawerContent>
        </Drawer>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl border-border/80 bg-card p-6 text-card-foreground">
        <DialogHeader className="flex flex-row items-center justify-between mb-4">
          <DialogTitle className="text-xl">Search filters</DialogTitle>
        </DialogHeader>

        <FilterContent localFilters={localFilters} handleFilterClick={handleFilterClick} />

        <div className="flex justify-end mt-6">
            <Button variant="primary" onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
