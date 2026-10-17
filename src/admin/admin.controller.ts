import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import { ClipsService } from '../clips/clips.service.js';
import { AdminService } from './admin.service.js';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly campaignsService: CampaignsService,
    private readonly clipsService: ClipsService,
  ) {}

  @Get('campaigns/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Review pending campaign approvals',
    description: 'Returns all campaigns awaiting admin review before they can go live. Use this queue for brand-safety checks and campaign release decisions.',
  })
  getPendingCampaigns() {
    return this.adminService.getCampaignQueue(this.campaignsService.listCampaigns());
  }

  @Get('clips/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Review clips awaiting moderation',
    description: 'Returns all clips pending moderation, so the admin team can check compliance and decide whether to approve, reject, or hold them.',
  })
  getPendingClips() {
    return this.adminService.getClipQueue(this.clipsService.listClips());
  }

  @Patch('campaigns/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a campaign',
    description: 'Admin-only action used to move a campaign into the live marketplace or reject it due to compliance or quality issues.',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID to approve or reject.', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['approved', 'rejected'], description: 'Campaign approval decision.' },
        adminNotes: { type: 'string', description: 'Optional notes for the client-facing moderation record.' },
      },
      required: ['status'],
      example: {
        status: 'approved',
        adminNotes: 'Campaign meets compliance requirements and production goals.',
      },
    },
  })
  approveCampaign(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected'; adminNotes?: string }) {
    return this.campaignsService.updateCampaignStatus(id, body.status, body.adminNotes);
  }

  @Patch('clips/:id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Moderate a clip submission',
    description: 'Admin-only moderator action for accepting or rejecting a clip against the campaign brief and brand-safety rules.',
  })
  @ApiParam({ name: 'id', description: 'Clip ID to moderate.', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['approved', 'rejected', 'under_review'], description: 'Moderation verdict for the clip.' },
        adminNotes: { type: 'string', description: 'Optional explanation of the moderation outcome.' },
      },
      required: ['status'],
      example: {
        status: 'under_review',
        adminNotes: 'Please verify the clip against the final brand guideline before approval.',
      },
    },
  })
  moderateClip(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' | 'under_review'; adminNotes?: string }) {
    return this.clipsService.moderateClip(id, body.status, body.adminNotes);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the admin operations dashboard summary',
    description: 'Returns the operational summary used by the admin team to track campaign flow, moderation backlog, and verified performance.',
  })
  getDashboardSummary() {
    return this.adminService.getAdminDashboardSummary(
      this.campaignsService.listCampaigns(),
      this.clipsService.listClips(),
    );
  }
}
