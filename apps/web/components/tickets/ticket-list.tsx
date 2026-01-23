'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';
import { useI18n } from '@/app/i18n-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export function TicketList({ adminView }: { adminView?: boolean }) {
    const { apiFetch } = useAuth();
    const { locale, dict } = useI18n();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const tTickets = dict.tickets as any || {};

    useEffect(() => {
        apiFetch('/tickets').then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to load');
        }).then(data => {
            setTickets(data);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [apiFetch]);

    if (loading) return <div>{dict.common.loading}</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{tTickets.list?.title || 'Tickets'}</CardTitle>
                {!adminView && (
                    <Link href={`/${locale}/g/tickets/new`}>
                        <Button><Plus className="mr-2 h-4 w-4" /> {tTickets.list?.create || 'New Ticket'}</Button>
                    </Link>
                )}
            </CardHeader>
            <CardContent>
                {tickets.length === 0 ? (
                    <p className="text-muted-foreground">{tTickets.list?.empty || 'No tickets found.'}</p>
                ) : (
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <Link href={adminView ? `/${locale}/s/tickets/${ticket.id}` : `/${locale}/g/tickets/${ticket.id}`} key={ticket.id} className="block border rounded p-4 hover:bg-muted/50 transition">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{ticket.subject}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            #{ticket.id.slice(0, 8)} • {new Date(ticket.createdAt).toLocaleDateString()}
                                            {ticket.createdBy && ` • By ${ticket.createdBy.name || ticket.createdBy.email}`}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                                            ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                                ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                        }`}>
                                        {tTickets.status?.[ticket.status] || ticket.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
