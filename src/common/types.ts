export type UserRole = 'client' | 'clipper' | 'admin';
export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
export type ClipStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'verified';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface SocialPage {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x';
  handle: string;
  followerCount: number;
  niche: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  companyName?: string;
  niche?: string;
  socialPages?: SocialPage[];
  earningsTotal?: number;
  campaignsCompleted?: number;
  isVerified?: boolean;
  status?: 'active' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile extends User {
  role: 'client';
  companyName: string;
}

export interface ClipperProfile extends User {
  role: 'clipper';
  socialPages: SocialPage[];
  earningsTotal: number;
  campaignsCompleted: number;
}

export interface Campaign {
  id: string;
  clientId: string;
  title: string;
  brief: string;
  niche: string;
  videoUrl: string;
  cpmRate: number;
  viewTarget: number;
  budget: number;
  platformFeePct: number;
  depositPaid: number;
  balanceDue: number;
  status: CampaignStatus;
  slotsLimit: number;
  claimedSlots: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface Clip {
  id: string;
  campaignId: string;
  clipperId: string;
  pageHandle: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x';
  postUrl: string;
  postDate: string;
  verificationWindowEnds: string;
  verifiedViews: number;
  status: ClipStatus;
  payoutAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  campaignId: string;
  userId: string;
  type: 'deposit' | 'balance';
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface DashboardSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  pendingClips: number;
  totalVerifiedViews: number;
  totalRevenue: number;
  totalPayouts: number;
}
