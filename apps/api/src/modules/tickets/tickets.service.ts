import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto, CreateGuestTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { TicketStatus, TicketType, Role } from '@prisma/client';

@Injectable()
export class TicketsService {
    constructor(private prisma: PrismaService) { }

    async createGuestTicket(data: CreateGuestTicketDto) {
        return this.prisma.ticket.create({
            data: {
                subject: data.subject,
                guestName: data.name,
                guestEmail: data.email,
                priority: data.priority,
                type: data.type,
                messages: {
                    create: {
                        message: data.message,
                    },
                },
            },
            include: {
                messages: true,
            },
        });
    }

    async createTicket(userId: string, tenantId: string, userRole: Role, data: CreateTicketDto) {
        // If Guardian, check for existing open tickets
        if (userRole === Role.GUARDIAN) {
            const openTicket = await this.prisma.ticket.findFirst({
                where: {
                    tenantId,
                    createdById: userId,
                    status: {
                        in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
                    },
                },
            });

            if (openTicket) {
                throw new BadRequestException('You already have an open ticket. Please close it before creating a new one.');
            }
        }

        return this.prisma.ticket.create({
            data: {
                subject: data.subject,
                priority: data.priority,
                type: data.type,
                createdById: userId,
                tenantId: tenantId,
                messages: {
                    create: {
                        message: data.message,
                        userId: userId,
                    },
                },
            },
            include: {
                messages: true,
            },
        });
    }

    async findAll(userId: string, userRole: Role, tenantId?: string) {
        const where: any = {};

        if (userRole === Role.PLATFORM_ADMIN || userRole === Role.PLATFORM_SUPPORT) {
            // Platform sees all tickets, or filter by tenant if provided
            // Also include guest tickets (tenantId is null)
            if (tenantId) {
                where.tenantId = tenantId;
            }
        } else if (userRole === Role.GUARDIAN) {
            // Guardian sees only their own tickets in the specific tenant
            if (!tenantId) throw new BadRequestException('Tenant ID is required for Guardians');
            where.tenantId = tenantId;
            where.createdById = userId;
        } else {
            // School Admin / Staff sees all tickets for their tenant
            if (!tenantId) throw new BadRequestException('Tenant ID is required for School Staff');
            where.tenantId = tenantId;
        }

        return this.prisma.ticket.findMany({
            where,
            include: {
                createdBy: {
                    select: { name: true, email: true },
                },
                tenant: {
                    select: { name: true },
                },
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    async findOne(id: string, userId: string, userRole: Role, tenantId?: string) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id },
            include: {
                messages: {
                    include: {
                        user: {
                            select: { name: true, email: true, type: true, memberships: { select: { role: true } } }, // Simplifying user fetch
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                createdBy: {
                    select: { name: true, email: true },
                },
            },
        });

        if (!ticket) throw new NotFoundException('Ticket not found');

        // Access Control
        if (userRole === Role.PLATFORM_ADMIN || userRole === Role.PLATFORM_SUPPORT) {
            // Access granted
        } else if (userRole === Role.GUARDIAN) {
            if (ticket.createdById !== userId) {
                throw new ForbiddenException('Access denied');
            }
        } else {
            // School Staff
            if (ticket.tenantId !== tenantId) {
                throw new ForbiddenException('Access denied');
            }
        }

        return ticket;
    }

    async addMessage(id: string, userId: string, message: string) {
        // Check existence and access logic should ideally be here or guarded before
        // For simplicity assuming access is checked by findOne or caller, but better to check again.
        // For now, simple create.

        // We update the ticket's updatedAt as well
        const newMessage = await this.prisma.ticketMessage.create({
            data: {
                ticketId: id,
                userId,
                message,
            },
        });

        await this.prisma.ticket.update({
            where: { id },
            data: { updatedAt: new Date() },
        });

        return newMessage;
    }

    async escalate(id: string, userId: string, tenantId: string) {
        // Only school staff can escalate? or Guardian too? Usually School Admin escalates to Platform.
        // Let's allow School Admin to escalate.
        const ticket = await this.prisma.ticket.findUnique({ where: { id } });
        if (!ticket || ticket.tenantId !== tenantId) {
            throw new ForbiddenException('Cannot escalate this ticket');
        }

        return this.prisma.ticket.update({
            where: { id },
            data: {
                escalatedToPid: true,
                // Optional: Assign to platform group?
            },
        });
    }

    async close(id: string, userId: string) {
        // Optional: verify access
        return this.prisma.ticket.update({
            where: { id },
            data: {
                status: TicketStatus.CLOSED,
                closedAt: new Date(),
                // closedById: userId // if schema supports it
            },
        });
    }
}
