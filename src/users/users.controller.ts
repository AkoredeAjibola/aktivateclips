import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns the full user directory for internal staff use. Intended for admin-only internal dashboards and moderation workflows.',
  })
  listUsers() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch a single user by ID',
    description: 'Returns a specific user record by UUID. Useful for loading client or clipper profiles into the frontend.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique user identifier (UUID) of the target client, clipper, or admin.',
    type: String,
  })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
