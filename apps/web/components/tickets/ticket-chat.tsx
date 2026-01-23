'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/app/auth-context';
import { useI18n } from '@/app/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export function TicketChat({ ticketId }: { ticketId: string }) {
    const { apiFetch, user } = useAuth();
    const { dict } = useI18n();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const tTickets = dict.tickets as any || {};

    const loadTicket = () => {
        apiFetch(`/tickets/${ticketId}`).then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed');
        }).then(data => setTicket(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTicket();
        const interval = setInterval(loadTicket, 10000);
        return () => clearInterval(interval);
    }, [ticketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setSending(true);
        try {
            await apiFetch(`/tickets/${ticketId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message: newMessage })
            });
            setNewMessage('');
            loadTicket();
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const closeTicket = async () => {
        if (!confirm(tTickets.chat?.confirmClose || 'Are you sure you want to close this ticket?')) return;
        await apiFetch(`/tickets/${ticketId}/close`, { method: 'PATCH' });
        loadTicket();
    };

    // Escalate logic
    const escalateTicket = async () => {
        if (!confirm(tTickets.chat?.confirmEscalate || 'Escalate to Platform Admin?')) return;
        setSending(true);
        try {
            await apiFetch(`/tickets/${ticketId}/escalate`, { method: 'PATCH' });
            loadTicket();
        } finally { setSending(false); }
    };

    if (loading) return <div>{dict.common.loading}</div>;
    if (!ticket) return <div>Ticket not found</div>;

    return (
        <div className="flex flex-col h-[600px] border rounded bg-background">
            <div className="p-4 border-b flex justify-between items-center bg-card">
                <div>
                    <h3 className="font-semibold">{ticket.subject}</h3>
                    <div className="flex gap-2 items-center mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {tTickets.status?.[ticket.status] || ticket.status}
                        </span>
                        {ticket.escalatedToPid && <span className="text-xs bg-red-100 text-red-800 px-1 rounded">{tTickets.chat?.escalatedLabel || 'Escalated'}</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {ticket.status !== 'CLOSED' && user?.userType === 'STAFF' && !ticket.escalatedToPid && (
                        <Button variant="destructive" size="sm" onClick={escalateTicket} disabled={sending}>
                            {tTickets.chat?.escalate || 'Escalate'}
                        </Button>
                    )}
                    {ticket.status !== 'CLOSED' && (
                        <Button variant="outline" size="sm" onClick={closeTicket}>
                            {tTickets.chat?.close || 'Close'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {ticket.messages.map((msg: any) => {
                    const isMe = msg.userId === user?.id;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm shadow-sm">{msg.message}</p>
                                <span className={`text-[10px] opacity-70 block text-right mt-1 ${isMe ? 'text-primary-foreground' : ''}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {ticket.status !== 'CLOSED' && (
                <form onSubmit={sendMessage} className="p-4 border-t flex gap-2 bg-card">
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={tTickets.chat?.placeholder || 'Type message...'}
                        disabled={sending}
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            )}
        </div>
    );
}
