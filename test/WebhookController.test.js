import crypto from 'crypto';
import { verifyMercadoPagoSignature } from '../src/controllers/WebhookController.js';

describe('Mercado Pago webhook signature', () => {
    const secret = 'test-webhook-secret';
    const dataId = '123456789';
    const requestId = 'request-123';
    const timestamp = '1704908010';

    beforeEach(() => {
        process.env.MP_WEBHOOK_SECRET = secret;
    });

    it('accepts the Mercado Pago HMAC manifest', () => {
        const signature = crypto.createHmac('sha256', secret)
            .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
            .digest('hex');
        const req = {
            query: { 'data.id': dataId },
            get: (name) => ({ 'x-signature': `ts=${timestamp},v1=${signature}`, 'x-request-id': requestId }[name])
        };

        expect(verifyMercadoPagoSignature(req)).toBe(true);
    });

    it('rejects a modified signature', () => {
        const req = {
            query: { 'data.id': dataId },
            get: (name) => ({ 'x-signature': `ts=${timestamp},v1=${'0'.repeat(64)}`, 'x-request-id': requestId }[name])
        };

        expect(verifyMercadoPagoSignature(req)).toBe(false);
    });

    it('accepts a request id concatenated to v1 by a proxy', () => {
        const signature = crypto.createHmac('sha256', secret)
            .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
            .digest('hex');
        const req = {
            query: { 'data.id': dataId },
            get: (name) => ({ 'x-signature': `ts=${timestamp},v1=${signature} ${requestId}` }[name])
        };

        expect(verifyMercadoPagoSignature(req)).toBe(true);
    });
});
