import { Injectable } from '@nestjs/common';
import type { Campaign, Clip, DashboardSummary } from '../common/types.js';

@Injectable()
export class AdminService {
  getCampaignQueue(campaigns: Campaign[]): Campaign[] {
    return campaigns.filter((campaign) => campaign.status === 'pending_review');
  }

  getClipQueue(clips: Clip[]): Clip[] {
    return clips.filter((clip) => ['pending', 'under_review'].includes(clip.status));
  }

  getAdminDashboardSummary(campaigns: Campaign[], clips: Clip[]): DashboardSummary {
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((item) => ['approved', 'active'].includes(item.status)).length,
      pendingClips: clips.filter((item) => ['pending', 'under_review'].includes(item.status)).length,
      totalVerifiedViews: clips.reduce((sum, item) => sum + item.verifiedViews, 0),
      totalRevenue: campaigns.reduce((sum, item) => sum + item.balanceDue, 0),
      totalPayouts: clips.reduce((sum, item) => sum + item.payoutAmount, 0),
    };
  }
}
