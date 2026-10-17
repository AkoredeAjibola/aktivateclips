import { Injectable } from '@nestjs/common';
import type { Campaign, Clip, DashboardSummary } from '../common/types.js';

@Injectable()
export class DashboardService {
  buildClientSummary(campaigns: Campaign[], clips: Clip[]): DashboardSummary {
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((campaign) => ['approved', 'active'].includes(campaign.status)).length,
      pendingClips: clips.filter((clip) => ['pending', 'under_review'].includes(clip.status)).length,
      totalVerifiedViews: clips.reduce((sum, clip) => sum + clip.verifiedViews, 0),
      totalRevenue: campaigns.reduce((sum, campaign) => sum + campaign.budget, 0),
      totalPayouts: clips.reduce((sum, clip) => sum + clip.payoutAmount, 0),
    };
  }

  buildClipperSummary(clips: Clip[]): DashboardSummary {
    return {
      totalCampaigns: new Set(clips.map((clip) => clip.campaignId)).size,
      activeCampaigns: clips.filter((clip) => ['approved', 'verified'].includes(clip.status)).length,
      pendingClips: clips.filter((clip) => clip.status === 'pending').length,
      totalVerifiedViews: clips.reduce((sum, clip) => sum + clip.verifiedViews, 0),
      totalRevenue: clips.reduce((sum, clip) => sum + clip.payoutAmount, 0),
      totalPayouts: clips.reduce((sum, clip) => sum + clip.payoutAmount, 0),
    };
  }
}
