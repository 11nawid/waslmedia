
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface NewsCardProps {
    title: string;
    items: string[];
}

export function NewsCard({ title, items }: NewsCardProps) {
    return (
        <Card className="bg-secondary/30 border-none text-foreground">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center justify-between group">
                            <span className="text-sm text-foreground/90">{item}</span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
