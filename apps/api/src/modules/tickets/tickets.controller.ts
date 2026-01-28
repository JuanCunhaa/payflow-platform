import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateGuestTicketDto, CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';

import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Public()
  @Post('guest')
  createGuest(@Body() createGuestTicketDto: CreateGuestTicketDto) {
    return this.ticketsService.createGuestTicket(createGuestTicketDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Request() req,
    @Body() createTicketDto: CreateTicketDto
  ) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // Assuming user role logic is handled here or by service validation
    return this.ticketsService.createTicket(
      user.id,
      tenantId,
      (user.role as Role) || Role.GUARDIAN,
      createTicketDto
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Request() req) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.ticketsService.findAll(user.id, (user.role as Role) || Role.GUARDIAN, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Request() req) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.ticketsService.findOne(id, user.id, (user.role as Role) || Role.GUARDIAN, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.ticketsService.addMessage(id, user.id, createMessageDto.message);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/escalate')
  escalate(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Request() req) {
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.ticketsService.escalate(id, user.id, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ticketsService.close(id, user.id);
  }
}
