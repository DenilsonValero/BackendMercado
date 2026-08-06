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
    
    // 🔴 Declaramos la variable signature aquí correctamente
    const signature = req.get('x-signature');
    const { ts, v1, requestId: requestIdFromSignature } = signatureParts(signature);
    
    const requestId = req.get('x-request-id') || requestIdFromSignature;
    let dataId = String(req.query['data.id'] || req.body?.data?.id || '').toLowerCase();

    // Cuando el webhook se envía con un cuerpo JSON, Mercado Pago puede usar
    // el cuerpo crudo para generar la firma. Intentamos parsearlo para obtener el ID.
    if (!dataId && req.rawBody) {
        try {
            const body = JSON.parse(req.rawBody.toString());
            dataId = String(body?.data?.id || '').toLowerCase();
        } catch (e) { /* Ignoramos el error si el cuerpo no es JSON válido */ }
    }
    
    if (!ts || !v1 || !dataId) return false;
    const manifest = `data-id:${dataId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
    
    // 🔍 Imprimimos el manifest exacto que armamos para compararlo
    console.log("MANIFIESTO CALCULADO:", manifest);
    console.log("ESPERADO:", expected);
    console.log("RECIBIDO (v1):", v1);

    const actual = Buffer.from(v1, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    
    // MODO PRUEBA TEMPORAL: Si quieres que pase siempre mientras debugueas en Render, 
    // puedes descomentar la siguiente línea temporalmente:
    // return true; 

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
