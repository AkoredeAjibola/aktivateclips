import { PrismaClient, CampaignStatus, ClipStatus, PaymentStatus, PaymentType, Platform, Role, UserStatus } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.clip.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.socialPage.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@aktivateclips.com',
      passwordHash: hashSync('Admin123!', 10),
      name: 'Akinbola Asalu',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@aktivateclips.com',
      passwordHash: hashSync('Client123!', 10),
      name: 'Family Feud Nigeria',
      role: Role.CLIENT,
      companyName: 'Family Feud Nigeria',
      niche: 'entertainment',
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const clipper = await prisma.user.create({
    data: {
      email: 'clipper@aktivateclips.com',
      passwordHash: hashSync('Clipper123!', 10),
      name: 'Tunde Creator',
      role: Role.CLIPPER,
      niche: 'sports',
      status: UserStatus.ACTIVE,
      isVerified: true,
      socialPages: {
        create: [
          {
            platform: Platform.INSTAGRAM,
            handle: '@tundecreator',
            followerCount: 23000,
            niche: 'sports',
          },
        ],
      },
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      clientId: client.id,
      title: 'Family Feud Nigeria spotlight clips',
      brief: 'Create punchy clips that celebrate big reveals and moments of surprise while keeping brand-safe tone.',
      niche: 'entertainment',
      videoUrl: 'https://example.com/family-feud-source.mp4',
      cpmRate: 3000,
      viewTarget: 200000,
      budget: 600000,
      platformFeePct: 20,
      depositPaid: 300000,
      balanceDue: 300000,
      status: CampaignStatus.ACTIVE,
      slotsLimit: 5,
      claimedSlots: 1,
    },
  });

  const clip = await prisma.clip.create({
    data: {
      campaignId: campaign.id,
      clipperId: clipper.id,
      pageHandle: '@tundecreator',
      platform: Platform.INSTAGRAM,
      postUrl: 'https://instagram.com/reel/clip-1',
      postDate: new Date(),
      verificationWindowEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      verifiedViews: 18000,
      status: ClipStatus.APPROVED,
      payoutAmount: 43200,
    },
  });

  await prisma.payment.create({
    data: {
      campaignId: campaign.id,
      userId: client.id,
      type: PaymentType.DEPOSIT,
      amount: 300000,
      status: PaymentStatus.PAID,
    },
  });

  console.log({ admin: admin.id, client: client.id, clipper: clipper.id, campaign: campaign.id, clip: clip.id });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
