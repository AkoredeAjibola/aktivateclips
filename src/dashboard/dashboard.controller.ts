import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import { ClipsService } from '../clips/clips.service.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly campaignsService: CampaignsService,
    private readonly clipsService: ClipsService,
  ) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated user dashboard overview',
    description:
      'Returns the current summary metrics across all campaigns and clips in the current marketplace context. This is useful for home dashboards and leadership reviews.',
  })
  overview() {
    const campaigns = this.campaignsService.listCampaigns();
    const clips = this.clipsService.listClips();
    return this.dashboardService.buildClientSummary(campaigns, clips);
  }

  @Get('client/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get campaign and performance metrics for a client',
    description:
      'Returns the aggregate performance data for a specific client, including active campaigns, verified views, and financial totals.',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Unique client user ID whose dashboard metrics are being requested.',
    type: String,
  })
  clientSummary(@Param('clientId') clientId: string) {
    const campaigns = this.campaignsService.listCampaigns().filter((campaign) => campaign.clientId === clientId);
    const clips = this.clipsService.listClips().filter((clip) => campaigns.some((campaign) => campaign.id === clip.campaignId));
    return this.dashboardService.buildClientSummary(campaigns, clips);
  }

  @Get('clipper/:clipperId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get campaign and earnings metrics for a clipper',
    description:
      'Returns the aggregate performance and earnings snapshot for one clipper, including approved clips, pending work, and verified payout totals.',
  })
  @ApiParam({
    name: 'clipperId',
    description: 'Unique clipper user ID whose earnings and campaign metrics should be returned.',
    type: String,
  })
  clipperSummary(@Param('clipperId') clipperId: string) {
    const clips = this.clipsService.listClips().filter((clip) => clip.clipperId === clipperId);
    return this.dashboardService.buildClipperSummary(clips);
  }
}
