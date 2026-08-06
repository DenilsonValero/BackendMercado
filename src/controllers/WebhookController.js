import crypto from 'crypto';
import AppError from '../shared/errors/AppError.js';
import express from 'express';
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
    const dataId = String(req.query['data.id'] || req.body?.data?.id || '').toLowerCase();

    console.log("--- DEBUG FIRMA ---");
    console.log("Header x-signature recibido:", signature);
    console.log("Header x-request-id recibido:", requestId);
    console.log("Data ID extraído:", dataId);
    console.log("Timestamp (ts):", ts);
    console.log("v1 extraído:", v1);
    if (!ts || !v1 || !requestId || !dataId) return false;

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

    console.log("Manifest construido:", manifest);
    console.log("Firma esperada (nuestra):", expected);
    console.log("Firma real (de MP):", v1);

    const actual = Buffer.from(v1, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    console.log("¿La firma es válida?:", isValid);
    console.log("-------------------");
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
};

const preReceiveMercadoPago = express.json({
    verify: (req, res, buf) => { req.rawBody = buf; },
    type: '*/*'
});

const receiveMercadoPago = async (req, res, next) => {
    try {
        const signature = req.get('x-signature');
        const requestId = req.get('x-request-id');
        const dataId = req.query['data.id'] || req.body?.data?.id;
        const eventType = req.body?.type || req.query.type;

        console.log(`🔔 [WEBHOOK] Petición recibida. Evento: ${eventType}, ID: ${dataId}, Request-ID: ${requestId}`);

        if (!verifyMercadoPagoSignature(req)) {
            console.warn(`❌ [WEBHOOK] Firma inválida para ${dataId}. Signature: ${signature?.substring(0, 15)}...`);
            return res.status(401).json({ error: 'Firma de webhook invalida', code: 'INVALID_WEBHOOK_SIGNATURE' });
        }
        console.log(`✅ [WEBHOOK] Firma válida para ${dataId}.`);

        if (!dataId || (eventType && eventType !== 'payment')) {
            console.log(`[WEBHOOK] Evento ignorado (no es un pago o no tiene ID). Respondiendo 200.`);
            return res.sendStatus(200);
        }

        await processMercadoPagoPayment(dataId);
        console.log(`💰 [WEBHOOK] Pago ${dataId} procesado correctamente en la BD.`);
        return res.sendStatus(200);
    } catch (error) {
        console.error("🔥 [WEBHOOK] Error crítico en el controlador:", error);
        next(error);
    }
};

export default { preReceiveMercadoPago, receiveMercadoPago };
