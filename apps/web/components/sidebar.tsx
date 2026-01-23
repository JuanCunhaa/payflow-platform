'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    items: {
        href: string;
        label: string;
        icon?: React.ComponentType<{ className?: string }>;
    }[];
}

export function Sidebar({ className, title, items }: SidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-slate-900 text-slate-50", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xl font-bold tracking-tight text-primary">
                        {title || 'PayFlow'}
                    </h2>
                    <div className="space-y-1">
                        {items.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-2",
                                            isActive
                                                ? "bg-slate-800 text-white hover:bg-slate-800"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        )}
                                    >
                                        {item.icon && <item.icon className="h-4 w-4" />}
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mobile sidebar using Sheet (optional for now, but good for "User Friendly")
export function MobileSidebar({ title, items }: SidebarProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-slate-900 text-slate-50 w-64 border-r-slate-800">
                <Sidebar title={title} items={items} className="border-none" />
            </SheetContent>
        </Sheet>
    )
}
