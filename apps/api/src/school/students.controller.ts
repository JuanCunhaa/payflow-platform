import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type StudentStatus = 'ACTIVE' | 'INACTIVE';

const ALLOWED_STATUSES: StudentStatus[] = ['ACTIVE', 'INACTIVE'];

function parseStudentStatus(value?: string): StudentStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (ALLOWED_STATUSES.includes(upper as StudentStatus)) {
    return upper as StudentStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid student status',
  });
}

function parsePageParams(pageParam?: string, pageSizeParam?: string) {
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const pageSizeRaw = parseInt(pageSizeParam ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  return { page, pageSize };
}

@Controller('school/students')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('SCHOOL_ADMIN', 'SECRETARY', 'READONLY')
  async listStudents(
    @Req() req: TenantRequest,
    @Query('classId') classId?: string,
    @Query('status') statusParam?: string,
    @Query('q') searchQuery?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, limitParam);
    const status = parseStudentStatus(statusParam);

    const where: {
      tenantId: string;
      classId?: string;
      status?: StudentStatus;
      name?: { contains: string; mode: 'insensitive' };
    } = { tenantId };

    if (classId) {
      where.classId = classId;
    }

    if (status) {
      where.status = status;
    }

    const q = searchQuery?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async createStudent(@Req() req: TenantRequest, @Body() dto: CreateStudentDto) {
    const tenantId = req.tenant!.id;

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, tenantId },
      select: { id: true },
    });

    if (!classEntity) {
      throw new BadRequestException({
        code: 'invalid_class',
        message: 'Class does not exist for this tenant',
      });
    }

    const status: StudentStatus = (dto.status as StudentStatus | undefined) ?? 'ACTIVE';

    try {
      const student = await this.prisma.student.create({
        data: {
          tenantId,
          classId: classEntity.id,
          name,
          status,
        },
      });

      return { student };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'student_duplicate',
          message: 'A student with this name already exists in this class',
        });
      }
      throw error;
    }
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async updateStudent(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto
  ) {
    const tenantId = req.tenant!.id;

    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'student_not_found',
        message: 'Student not found for this tenant',
      });
    }

    const data: { name?: string; classId?: string; status?: StudentStatus } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException({
          code: 'invalid_name',
          message: 'Name is required',
        });
      }
      data.name = name;
    }

    if (dto.classId !== undefined) {
      const classEntity = await this.prisma.class.findFirst({
        where: { id: dto.classId, tenantId },
        select: { id: true },
      });

      if (!classEntity) {
        throw new BadRequestException({
          code: 'invalid_class',
          message: 'Class does not exist for this tenant',
        });
      }
      data.classId = classEntity.id;
    }

    if (dto.status !== undefined) {
      const status = parseStudentStatus(dto.status);
      if (!status) {
        throw new BadRequestException({
          code: 'invalid_status',
          message: 'Invalid student status',
        });
      }
      data.status = status;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException({
        code: 'no_changes',
        message: 'No fields to update',
      });
    }

    try {
      const student = await this.prisma.student.update({
        where: { id },
        data,
      });
      return { student };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'student_duplicate',
          message: 'A student with this name already exists in this class',
        });
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async deleteStudent(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    const result = await this.prisma.student.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      throw new NotFoundException({
        code: 'student_not_found',
        message: 'Student not found for this tenant',
      });
    }

    return { success: true };
  }
}
