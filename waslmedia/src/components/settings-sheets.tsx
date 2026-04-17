
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, Check, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocationStore } from '@/hooks/use-location-store';
import { countries } from '@/lib/countries';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';


interface SettingsSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function AppearanceSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
    const { theme, setTheme } = useTheme();

    const themeOptions = [
        { value: 'light', label: 'Light theme', icon: Sun },
        { value: 'dark', label: 'Dark theme', icon: Moon },
        { value: 'system', label: 'Use device theme', icon: Monitor },
    ];
    
    const isMobile = useIsMobile();
    const sheetSide = isMobile ? 'bottom' : 'right';

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side={sheetSide} className="p-0 rounded-t-lg md:rounded-none">
                <SheetHeader className="p-4 flex flex-row items-center gap-4 border-b">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onOpenChange(false)}>
                        <ArrowLeft />
                    </Button>
                    <SheetTitle>Appearance</SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-2">
                    {themeOptions.map(option => (
                        <button 
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={cn(
                                "w-full flex items-center p-3 rounded-lg text-left",
                                theme === option.value ? "bg-secondary" : "hover:bg-secondary/50"
                            )}
                        >
                            <option.icon className="w-5 h-5 mr-4" />
                            <span className="flex-1">{option.label}</span>
                            {theme === option.value && <Check className="w-5 h-5 text-primary" />}
                        </button>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    )
}

export function LocationSheet({ isOpen, onOpenChange }: SettingsSheetProps) {
    const { location, setLocation } = useLocationStore();
    const [searchTerm, setSearchTerm] = useState('');
    const isMobile = useIsMobile();
    const sheetSide = isMobile ? 'bottom' : 'right';

    const filteredCountries = countries.filter(country => 
        country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectLocation = (newLocation: string) => {
        setLocation(newLocation);
        onOpenChange(false);
    }
    
    return (
         <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side={sheetSide} className="p-0 flex flex-col h-full rounded-t-lg md:rounded-none">
                 <SheetHeader className="p-4 flex flex-row items-center gap-4 border-b">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onOpenChange(false)}>
                        <ArrowLeft />
                    </Button>
                    <SheetTitle>Location</SheetTitle>
                </SheetHeader>
                <div className="p-4 border-b">
                     <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search" 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-1">
                        {filteredCountries.map(country => (
                            <button 
                                key={country.code}
                                onClick={() => handleSelectLocation(country.name)}
                                className={cn(
                                    "w-full flex items-center p-3 rounded-lg text-left",
                                    location === country.name ? "bg-secondary" : "hover:bg-secondary/50"
                                )}
                            >
                                <span className="flex-1">{country.name}</span>
                                {location === country.name && <Check className="w-5 h-5 text-primary" />}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
