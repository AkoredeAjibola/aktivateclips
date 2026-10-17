import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ClipsService } from './clips.service.js';
import type { CreateClipDto } from './clips.service.js';

@ApiTags('clips')
@Controller('clips')
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('clipper')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a new clip for a campaign',
    description:
      'Creates a new clip submission from a clipper account. The system records the post URL, platform, and verification timeline for payout processing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID that the clip belongs to.' },
        pageHandle: { type: 'string', description: 'The creator page or handle where the clip was posted.' },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube', 'x'], description: 'Social platform used for publishing.' },
        postUrl: { type: 'string', description: 'Public link to the final clip post.' },
        postDate: { type: 'string', format: 'date-time', description: 'ISO timestamp for when the clip was published. Defaults to now if omitted.' },
      },
      required: ['campaignId', 'pageHandle', 'platform', 'postUrl'],
      example: {
        campaignId: 'campaign_123',
        pageHandle: '@fitflowcreator',
        platform: 'instagram',
        postUrl: 'https://instagram.com/reel/abc123',
        postDate: '2026-10-06T12:30:00.000Z',
      },
    },
  })
  createClip(@CurrentUser() user: any, @Body() dto: CreateClipDto) {
    return this.clipsService.createClip(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all submitted clips',
    description: 'Returns clip submissions across all campaigns for admin review and operational reporting.',
  })
  listClips() {
    return this.clipsService.listClips();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch a clip by id',
    description: 'Returns the detailed status of one clip submission, including verification status and payout value.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique clip ID to retrieve.',
    type: String,
  })
  getClip(@Param('id') id: string) {
    return this.clipsService.findById(id);
  }

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Moderate a submitted clip',
    description: 'Admin review endpoint for approving, rejecting, or holding a clip before it enters the verification window.',
  })
  @ApiParam({
    name: 'id',
    description: 'Clip ID to review.',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'under_review', 'verified'], description: 'Updated moderation status for the clip.' },
        adminNotes: { type: 'string', description: 'Optional comments explaining the moderation decision.' },
      },
      required: ['status'],
      example: {
        status: 'approved',
        adminNotes: 'Content meets brand guidelines and campaign brief.',
      },
    },
  })
  moderateClip(@Param('id') id: string, @Body() body: { status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'verified'; adminNotes?: string }) {
    return this.clipsService.moderateClip(id, body.status, body.adminNotes);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify or finalize clip views',
    description: 'Admin-only endpoint for recording verified views for a clip after the verification window or on manual review.',
  })
  @ApiParam({
    name: 'id',
    description: 'Clip ID whose verified view count should be updated.',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        verifiedViews: { type: 'number', description: 'Final verified view count used to calculate clipper payout.' },
      },
      required: ['verifiedViews'],
      example: {
        verifiedViews: 24500,
      },
    },
  })
  verifyClip(@Param('id') id: string, @Body() body: { verifiedViews: number }) {
    return this.clipsService.verifyClip(id, body.verifiedViews);
  }
}
