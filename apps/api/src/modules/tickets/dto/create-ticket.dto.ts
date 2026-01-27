import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketPriority, TicketType } from '@prisma/client';

export class CreateTicketDto {
    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    message: string; // Initial message

    @IsEnum(TicketPriority)
    @IsOptional()
    priority?: TicketPriority;

    @IsEnum(TicketType)
    @IsOptional()
    type?: TicketType;

    @IsString()
    @IsOptional()
    schoolId?: string; // For guardians to specify which school (tenant) if they have multiple? Actually relation is usually derived from context. But for now optional. 
    // Wait, Guardians belong to a Tenant. If a User is Guardian in multiple Tenants, they must select one.
    // The backend should probably handle this via the TenantContext or similar, or explicit tenantId in body.
    // Given the requirement "Guardians to create tickets for their school", we might need tenantId if the user has multiple. 
    // For now let's assume filtering by current context or passing tenantId.
}

export class CreateGuestTicketDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsEnum(TicketPriority)
    @IsOptional()
    priority?: TicketPriority;

    @IsEnum(TicketType)
    @IsOptional()
    type?: TicketType;
}
