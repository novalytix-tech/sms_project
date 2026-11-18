// ==========================================
// Payment Gateway Integration & Simulation Service
// Developed by NTS Novalytix
// ==========================================
//
// ARCHITECTURAL NOTICE FOR FUTURE PRODUCTION GATEWAY INTEGRATION:
// -------------------------------------------------------------
// When transitioning from this demo simulation to a real payment gateway
// (e.g. Razorpay, PayU, Easebuzz, BillDesk, or Cashfree):
//
// 1. SECURE SERVER-SIDE ORDER CREATION:
//    - The client MUST NOT create orders directly with the payment gateway.
//    - The frontend calls an authenticated backend endpoint: `POST /api/v1/payments/create-order`
//      passing `{ invoiceId, amountToPay }`.
//    - The backend verifies the student session, recalculates the outstanding
//      invoice balance from the database, and creates an order using the gateway's
//      secret API key.
//    - The backend returns `{ orderId, keyId, amount, currency, notes }` to the frontend.
//
// 2. CLIENT-SIDE CHECKOUT MODAL:
//    - The frontend loads the gateway SDK (e.g., Razorpay Checkout.js).
//    - It opens the hosted/embedded checkout using the `orderId` returned by the backend.
//    - NEVER store, expose, or transmit Secret Keys, API Secrets, Webhook Secrets,
//      or raw CVVs/pins on the client.
//
// 3. SECURE PAYMENT VERIFICATION:
//    - Upon gateway completion callback, the client receives:
//      `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`.
//    - The frontend sends these tokens to `POST /api/v1/payments/verify`.
//    - The backend computes HMAC-SHA256 signature using `order_id + '|' + payment_id`
//      and the Gateway Secret Key, and compares it in constant time.
//    - ONLY upon cryptographic verification does the backend update the invoice,
//      create the immutable ledger entry, and issue the signed official receipt.
//
// 4. WEBHOOK IDEMPOTENCY & RECONCILIATION:
//    - If the parent closes the browser before the callback returns, the Gateway
//      Webhooks (`payment.captured`, `payment.failed`) notify the backend.
//    - The backend uses idempotency keys to guarantee no duplicate credits or double charges.
// ==========================================

import { PaymentMethodType } from '../types';

export interface CreateOrderParams {
  invoiceId: string;
  invoiceNo: string;
  studentId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
}

export interface PaymentOrder {
  orderId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted';
  createdAt: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  transactionRef: string;
  signature?: string;
  amount: number;
}

export interface PaymentVerificationResult {
  verified: boolean;
  transactionRef: string;
  receiptNo: string;
  timestamp: string;
  error?: string;
}

/**
 * Payment Gateway Contract for future real API integration
 */
export interface IPaymentGateway {
  initiateOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
}

/**
 * Demo Payment Simulation Provider
 */
export class DemoPaymentService {
  /**
   * Generates unique demo transaction reference
   */
  public static generateTransactionRef(): string {
    const yr = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `TXN-DEMO-${yr}-${rand}`;
  }

  /**
   * Generates unique demo receipt number
   */
  public static generateReceiptNo(): string {
    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REC-${yr}-${rand}`;
  }

  /**
   * Simulates realistic network delay and gateway handshake
   */
  public static async simulateProcessing(delayMs: number = 1200): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

