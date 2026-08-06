import crypto from 'crypto';
import AppError from '../shared/errors/AppError.js';
import { getMercadoPagoConfig } from '../config/env.js';
import { processMercadoPagoPayment } from '../service/walletService.js';

const signatureParts = (signature) => {
    const parts = {};
    String(signature || '').split(',').forEach((part) => {
        const [key, val] = part.split('=').map((v) => v.trim());
        if (key && val) {
            if (key === 'v1') {
                // Algunos proxies concatenan x-request-id al valor de v1 con un espacio.
                const [signature, requestId] = val.split(/\s+/, 2);
                parts.v1 = signature;
                if (requestId) parts.requestId = requestId;
            } else {
                parts[key] = val;
            }
        }
    });
    return parts;
};

export const verifyMercadoPagoSignature = (req) => {
    const { webhookSecret } = getMercadoPagoConfig();
    if (!webhookSecret) throw new AppError('Webhook de Mercado Pago no configurado', 503, 'WEBHOOK_NOT_CONFIGURED');
    const { ts, v1, requestId: requestIdFromSignature } = signatureParts(req.get('x-signature'));
    // El header separado es el formato oficial; el fallback cubre proxies que lo concatenan a v1.
    const requestId = req.get('x-request-id') || requestIdFromSignature;
    const dataId = String(req.query['data.id'] || '').toLowerCase();
    if (!ts || !v1 || !requestId || !dataId) return false;

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
    const actual = Buffer.from(v1, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
};

const receiveMercadoPago = async (req, res, next) => {
    try {
        console.log("🔔 [WEBHOOK] Petición recibida en receiveMercadoPago");
        console.log("Headers entrantes:", req.headers['x-signature'], req.headers['x-request-id']);
        console.log("Query params:", req.query);
        if (!verifyMercadoPagoSignature(req)) {
            console.log("❌ [WEBHOOK] Firma inválida. Abortando proceso con 401.");
            return res.status(401).json({ error: 'Firma de webhook invalida', code: 'INVALID_WEBHOOK_SIGNATURE' });
        }
        const paymentId = req.query['data.id'] || req.body?.data?.id;
        const eventType = req.body?.type || req.query.type;
        console.log(`✅ [WEBHOOK] Firma válida. Tipo de evento: ${eventType} | ID: ${paymentId}`);
        if (!paymentId || (eventType && eventType !== 'payment')) return res.sendStatus(200);
        await processMercadoPagoPayment(paymentId);
        console.log(`💰 [WEBHOOK] Pago ${paymentId} procesado correctamente en la BD.`);
        return res.sendStatus(200);
    } catch (error) {
        console.error("🔥 [WEBHOOK] Error crítico en el controlador:", error);
        next(error);
    }
};

export default { receiveMercadoPago };
