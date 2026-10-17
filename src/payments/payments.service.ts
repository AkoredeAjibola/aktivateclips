import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PaymentRecord } from '../common/types.js';

@Injectable()
export class PaymentsService {
  private readonly payments: PaymentRecord[] = [
    {
      id: 'payment-1',
      campaignId: 'campaign-1',
      userId: 'client-1',
      type: 'deposit',
      amount: 300000,
      status: 'paid',
      createdAt: new Date().toISOString(),
    },
  ];

  listPayments(): PaymentRecord[] {
    return [...this.payments];
  }

  recordPayment(campaignId: string, userId: string, type: 'deposit' | 'balance', amount: number): PaymentRecord {
    const payment: PaymentRecord = {
      id: randomUUID(),
      campaignId,
      userId,
      type,
      amount,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    this.payments.push(payment);
    return payment;
  }
}
