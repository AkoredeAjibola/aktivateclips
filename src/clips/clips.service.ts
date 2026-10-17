import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CPM_RATE } from '../common/constants.js';
import type { Clip } from '../common/types.js';

export interface CreateClipDto {
  campaignId: string;
  pageHandle: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x';
  postUrl: string;
  postDate?: string;
}

@Injectable()
export class ClipsService {
  private readonly clips: Clip[] = [
    {
      id: 'clip-1',
      campaignId: 'campaign-1',
      clipperId: 'clipper-1',
      pageHandle: '@tundecreator',
      platform: 'instagram',
      postUrl: 'https://instagram.com/reel/clip-1',
      postDate: new Date().toISOString(),
      verificationWindowEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      verifiedViews: 18000,
      status: 'approved',
      payoutAmount: 43200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  listClips(): Clip[] {
    return [...this.clips].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findById(id: string): Clip | undefined {
    return this.clips.find((clip) => clip.id === id);
  }

  listByCampaign(campaignId: string): Clip[] {
    return this.clips.filter((clip) => clip.campaignId === campaignId);
  }

  listByClipper(clipperId: string): Clip[] {
    return this.clips.filter((clip) => clip.clipperId === clipperId);
  }

  createClip(clipperId: string, dto: CreateClipDto): Clip {
    const clip: Clip = {
      id: randomUUID(),
      campaignId: dto.campaignId,
      clipperId,
      pageHandle: dto.pageHandle,
      platform: dto.platform,
      postUrl: dto.postUrl,
      postDate: dto.postDate ?? new Date().toISOString(),
      verificationWindowEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      verifiedViews: 0,
      status: 'pending',
      payoutAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.clips.push(clip);
    return clip;
  }

  moderateClip(id: string, status: Clip['status'], adminNotes?: string): Clip {
    const clip = this.findById(id);
    if (!clip) {
      throw new NotFoundException(`Clip ${id} was not found.`);
    }

    clip.status = status;
    clip.updatedAt = new Date().toISOString();
    if (status === 'verified' && clip.verifiedViews > 0) {
      clip.payoutAmount = Number(((clip.verifiedViews * CPM_RATE * 0.8) / 1000).toFixed(2));
    }

    return clip;
  }

  verifyClip(id: string, verifiedViews: number): Clip {
    const clip = this.findById(id);
    if (!clip) {
      throw new NotFoundException(`Clip ${id} was not found.`);
    }

    clip.verifiedViews = verifiedViews;
    clip.status = 'verified';
    clip.payoutAmount = Number(((verifiedViews * CPM_RATE * 0.8) / 1000).toFixed(2));
    clip.updatedAt = new Date().toISOString();

    return clip;
  }
}
