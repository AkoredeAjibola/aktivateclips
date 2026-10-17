import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CPM_RATE, PLATFORM_FEE_PCT } from '../common/constants.js';
import type { Campaign } from '../common/types.js';

export interface CreateCampaignDto {
  title: string;
  brief: string;
  niche: string;
  videoUrl: string;
  viewTarget: number;
  slotsLimit?: number;
}

@Injectable()
export class CampaignsService {
  private readonly campaigns: Campaign[] = [
    {
      id: 'campaign-1',
      clientId: 'client-1',
      title: 'Family Feud Nigeria spotlight clips',
      brief: 'Create punchy clips that celebrate big reveals and moments of surprise while keeping brand-safe tone.',
      niche: 'entertainment',
      videoUrl: 'https://example.com/family-feud-source.mp4',
      cpmRate: CPM_RATE,
      viewTarget: 200000,
      budget: 600000,
      platformFeePct: PLATFORM_FEE_PCT,
      depositPaid: 300000,
      balanceDue: 300000,
      status: 'active',
      slotsLimit: 5,
      claimedSlots: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  listCampaigns(): Campaign[] {
    return [...this.campaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  findById(id: string): Campaign | undefined {
    return this.campaigns.find((campaign) => campaign.id === id);
  }

  createCampaign(clientId: string, dto: CreateCampaignDto): Campaign {
    const grossBudget = Number(((dto.viewTarget * CPM_RATE) / 1000).toFixed(2));
    const fee = Number((grossBudget * PLATFORM_FEE_PCT).toFixed(2));
    const budget = Number((grossBudget + fee).toFixed(2));
    const depositPaid = Number((budget * 0.5).toFixed(2));

    const campaign: Campaign = {
      id: randomUUID(),
      clientId,
      title: dto.title,
      brief: dto.brief,
      niche: dto.niche,
      videoUrl: dto.videoUrl,
      cpmRate: CPM_RATE,
      viewTarget: dto.viewTarget,
      budget,
      platformFeePct: PLATFORM_FEE_PCT,
      depositPaid,
      balanceDue: Number((budget - depositPaid).toFixed(2)),
      status: 'pending_review',
      slotsLimit: dto.slotsLimit ?? 5,
      claimedSlots: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.campaigns.push(campaign);
    return campaign;
  }

  updateCampaignStatus(id: string, status: Campaign['status'], adminNotes?: string): Campaign {
    const campaign = this.findById(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} was not found.`);
    }

    campaign.status = status;
    campaign.adminNotes = adminNotes;
    if (status === 'approved' || status === 'active') {
      campaign.approvedAt = new Date().toISOString();
    }
    campaign.updatedAt = new Date().toISOString();

    return campaign;
  }

  claimSlot(campaignId: string, clipperId: string): { campaign: Campaign; clipperId: string } {
    const campaign = this.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} was not found.`);
    }
    if (campaign.claimedSlots >= campaign.slotsLimit) {
      throw new Error('This campaign has reached its clipper capacity.');
    }

    campaign.claimedSlots += 1;
    campaign.updatedAt = new Date().toISOString();

    return { campaign, clipperId };
  }
}
