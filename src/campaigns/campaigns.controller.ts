import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CampaignsService } from './campaigns.service.js';
import type { CreateCampaignDto } from './campaigns.service.js';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new campaign as a client',
    description:
      'Creates a campaign for a client with source video URL, brief, niche, and target views. The system calculates the CPM-based cost and deposit automatically.',
  })
  @ApiBody({
    type: Object,
    description:
      'Campaign creation payload. `title`, `brief`, `niche`, `videoUrl`, and `viewTarget` are required. `slotsLimit` is optional and defaults to 5.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Campaign title shown in the client and clipper dashboards.' },
        brief: { type: 'string', description: 'Brand-safe campaign instructions and creative brief.' },
        niche: { type: 'string', description: 'Niche used for clipper matching and content targeting.' },
        videoUrl: { type: 'string', description: 'Direct link to the source long-form media asset.' },
        viewTarget: { type: 'number', description: 'Target verified views used for campaign pricing and fulfillment expectations.' },
        slotsLimit: { type: 'number', description: 'Maximum number of clippers allowed to work this campaign.' },
      },
      required: ['title', 'brief', 'niche', 'videoUrl', 'viewTarget'],
      example: {
        title: 'Summer Fitness Launch',
        brief: 'Create 3 short video clips promoting our new fitness supplement with a bold, high-energy look.',
        niche: 'fitness',
        videoUrl: 'https://cdn.example.com/brand-video.mp4',
        viewTarget: 50000,
        slotsLimit: 5,
      },
    },
  })
  createCampaign(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all campaigns',
    description: 'Returns every campaign in the system for dashboard, filtering, and operational review flows.',
  })
  listCampaigns() {
    return this.campaignsService.listCampaigns();
  }

  @Get('open')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List open campaigns for clippers',
    description: 'Returns only approved and active campaigns that are available for clipper slot claims.',
  })
  listOpenCampaigns() {
    return this.campaignsService.listCampaigns().filter((campaign) => ['approved', 'active'].includes(campaign.status));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch one campaign by id',
    description: 'Returns the complete campaign record for a single campaign including its pricing and status details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique campaign ID to retrieve.',
    type: String,
  })
  getCampaign(@Param('id') campaignId: string) {
    return this.campaignsService.findById(campaignId);
  }

  @Post(':id/claim-slot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('clipper')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Claim a campaign slot as a clipper',
    description:
      'Assigns one available slot to the authenticated clipper. Frontend should call this when a creator chooses to work a campaign.',
  })
  @ApiParam({
    name: 'id',
    description: 'Campaign ID for the campaign where the clipper wants to claim a slot.',
    type: String,
  })
  claimSlot(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.claimSlot(id, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a campaign',
    description:
      'Admin-only approval route for moving a campaign into live clipping or rejecting it for brand-safety or compliance reasons.',
  })
  @ApiParam({
    name: 'id',
    description: 'Campaign ID to approve or reject.',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['approved', 'rejected'], description: 'Approval verdict for the campaign.' },
        adminNotes: { type: 'string', description: 'Optional notes explaining the approval decision or rejection reasons.' },
      },
      required: ['status'],
      example: {
        status: 'approved',
        adminNotes: 'Creative brief aligns with product goals and brand safety standards.',
      },
    },
  })
  approveCampaign(@Param('id') id: string, @Body() body: { status?: 'approved' | 'rejected'; adminNotes?: string }) {
    const status = body.status ?? 'approved';
    return this.campaignsService.updateCampaignStatus(id, status, body.adminNotes);
  }
}
