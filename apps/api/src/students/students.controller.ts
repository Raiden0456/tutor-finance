import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator.js';
import { StudentsService } from './students.service.js';
import {
  CloseStudentPackageDto,
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentPackagePaymentDto,
  type StudentResponse,
} from './students.dto.js';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe) includeArchived: boolean,
  ): Promise<StudentResponse[]> {
    return this.service.list(user.id, includeArchived);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentResponse> {
    return this.service.findById(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() input: CreateStudentDto,
  ): Promise<StudentResponse> {
    return this.service.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: UpdateStudentDto,
  ): Promise<StudentResponse> {
    return this.service.update(user.id, id, patch);
  }

  @Post(':id/package/payment')
  updatePackagePayment(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateStudentPackagePaymentDto,
  ): Promise<StudentResponse> {
    return this.service.updatePackagePayment(user.id, id, input);
  }

  @Post(':id/package/close')
  closePackage(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CloseStudentPackageDto,
  ): Promise<StudentResponse> {
    return this.service.closePackage(user.id, id, input);
  }

  @Post(':id/archive')
  archive(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentResponse> {
    return this.service.archive(user.id, id);
  }

  @Delete(':id/archive')
  unarchive(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentResponse> {
    return this.service.unarchive(user.id, id);
  }
}
