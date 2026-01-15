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
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

type TenantRequest = Request & {
  tenant?: { id: string; slug: string };
};

function parsePageParams(pageParam?: string, pageSizeParam?: string) {
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const pageSizeRaw = parseInt(pageSizeParam ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  return { page, pageSize };
}

@Controller('school')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class GradesClassesController {
  constructor(private readonly prisma: PrismaService) {}

  // --------- GRADES ----------

  @Get('grades')
  @Roles('SCHOOL_ADMIN', 'SECRETARY', 'READONLY')
  async listGrades(
    @Req() req: TenantRequest,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, pageSizeParam);

    const where = { tenantId };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.grade.count({ where }),
      this.prisma.grade.findMany({
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

  @Post('grades')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async createGrade(@Req() req: TenantRequest, @Body() dto: CreateGradeDto) {
    const tenantId = req.tenant!.id;

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    try {
      const grade = await this.prisma.grade.create({
        data: {
          tenantId,
          name,
        },
      });

      return { grade };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'grade_duplicate',
          message: 'A grade with this name already exists for this school',
        });
      }
      throw error;
    }
  }

  @Put('grades/:id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async updateGrade(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto
  ) {
    const tenantId = req.tenant!.id;

    const data: { name?: string } = {};

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

    if (!Object.keys(data).length) {
      throw new BadRequestException({
        code: 'no_changes',
        message: 'No fields to update',
      });
    }

    try {
      const grade = await this.prisma.grade.update({
        where: { id_tenantId: { id, tenantId } },
        data,
      });
      return { grade };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'grade_duplicate',
          message: 'A grade with this name already exists for this school',
        });
      }

      throw new NotFoundException({
        code: 'grade_not_found',
        message: 'Grade not found for this tenant',
      });
    }
  }

  @Delete('grades/:id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async deleteGrade(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    const existingWithClasses = await this.prisma.class.count({
      where: { tenantId, gradeId: id },
    });

    if (existingWithClasses > 0) {
      throw new BadRequestException({
        code: 'grade_has_classes',
        message: 'Cannot delete a grade that still has classes',
      });
    }

    try {
      await this.prisma.grade.delete({
        where: { id_tenantId: { id, tenantId } },
      });
      return { success: true };
    } catch {
      throw new NotFoundException({
        code: 'grade_not_found',
        message: 'Grade not found for this tenant',
      });
    }
  }

  // --------- CLASSES ----------

  @Get('classes')
  @Roles('SCHOOL_ADMIN', 'SECRETARY', 'READONLY')
  async listClasses(
    @Req() req: TenantRequest,
    @Query('gradeId') gradeId?: string,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, pageSizeParam);

    const where: { tenantId: string; gradeId?: string } = { tenantId };
    if (gradeId) {
      where.gradeId = gradeId;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.class.count({ where }),
      this.prisma.class.findMany({
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

  @Post('classes')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async createClass(@Req() req: TenantRequest, @Body() dto: CreateClassDto) {
    const tenantId = req.tenant!.id;

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    const grade = await this.prisma.grade.findFirst({
      where: { id: dto.gradeId, tenantId },
      select: { id: true },
    });

    if (!grade) {
      throw new BadRequestException({
        code: 'invalid_grade',
        message: 'Grade does not exist for this tenant',
      });
    }

    try {
      const classEntity = await this.prisma.class.create({
        data: {
          tenantId,
          gradeId: grade.id,
          name,
        },
      });

      return { class: classEntity };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'class_duplicate',
          message: 'A class with this name already exists for this school',
        });
      }
      throw error;
    }
  }

  @Put('classes/:id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async updateClass(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto
  ) {
    const tenantId = req.tenant!.id;

    const data: { name?: string; gradeId?: string } = {};

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

    if (dto.gradeId !== undefined) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.gradeId, tenantId },
        select: { id: true },
      });

      if (!grade) {
        throw new BadRequestException({
          code: 'invalid_grade',
          message: 'Grade does not exist for this tenant',
        });
      }
      data.gradeId = grade.id;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException({
        code: 'no_changes',
        message: 'No fields to update',
      });
    }

    try {
      const classEntity = await this.prisma.class.update({
        where: { id_tenantId: { id, tenantId } },
        data,
      });
      return { class: classEntity };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'class_duplicate',
          message: 'A class with this name already exists for this school',
        });
      }

      throw new NotFoundException({
        code: 'class_not_found',
        message: 'Class not found for this tenant',
      });
    }
  }

  @Delete('classes/:id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async deleteClass(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    try {
      await this.prisma.class.delete({
        where: { id_tenantId: { id, tenantId } },
      });
      return { success: true };
    } catch {
      throw new NotFoundException({
        code: 'class_not_found',
        message: 'Class not found for this tenant',
      });
    }
  }
}
