import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('deposit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a campaign deposit payment',
    description:
      'Captures the initial 50% deposit for an activated campaign. This is required before a campaign is approved to begin clipping.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign being funded.' },
        amount: { type: 'number', description: 'Deposit amount for the selected campaign.' },
      },
      required: ['campaignId', 'amount'],
      example: {
        campaignId: 'campaign_123',
        amount: 2500,
      },
    },
  })
  recordDeposit(@CurrentUser() user: any, @Body() body: { campaignId: string; amount: number }) {
    return this.paymentsService.recordPayment(body.campaignId, user.id, 'deposit', body.amount);
  }

  @Post('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record the final campaign balance payment',
    description: 'Captures the remaining balance due at campaign completion based on verified views delivered by the clipper roster.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign whose final balance is being paid.' },
        amount: { type: 'number', description: 'Final balance to settle for the campaign.' },
      },
      required: ['campaignId', 'amount'],
      example: {
        campaignId: 'campaign_123',
        amount: 1200,
      },
    },
  })
  recordBalance(@CurrentUser() user: any, @Body() body: { campaignId: string; amount: number }) {
    return this.paymentsService.recordPayment(body.campaignId, user.id, 'balance', body.amount);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all payment events',
    description: 'Returns the records of all deposits and balance payments made across the marketplace.',
  })
  listPayments() {
    return this.paymentsService.listPayments();
  }

  @Get(':campaignId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch payment records for a campaign',
    description: 'Returns every payment event for a single campaign so the client or admin can reconcile the payment flow.',
  })
  @ApiParam({ name: 'campaignId', description: 'Unique campaign ID whose payment history should be fetched.', type: String })
  listCampaignPayments(@Param('campaignId') campaignId: string) {
    return this.paymentsService.listPayments().filter((payment) => payment.campaignId === campaignId);
  }
}
