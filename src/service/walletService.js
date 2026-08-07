import db from '../config/DB.js';
import crypto from 'crypto';
import AppError from '../shared/errors/AppError.js';
import { getMercadoPagoConfig } from '../config/env.js';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

export const creditTestBalance = async (userId, amount) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.query('SELECT user_id FROM users WHERE user_id = ? FOR UPDATE', [userId]);
        if (!users.length) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');

        await connection.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [amount, userId]);
        await connection.query(
            "INSERT INTO wallet_ledger (user_id, amount, type, reference_type) VALUES (?, ?, 'credit', 'test_credit')",
            [userId, amount]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getMercadoPagoClient = () => {
    const { accessToken, webhookUrl } = getMercadoPagoConfig();
    if (!accessToken || !webhookUrl) {
        throw new AppError('Mercado Pago no esta configurado en el servidor', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
    }
    // Inicializar el cliente con tu Access Token
    return new MercadoPagoConfig({ accessToken });
};

export const createTopUpPreference = async (userId, amount) => {
    const { webhookUrl } = getMercadoPagoConfig();
    const client = getMercadoPagoClient();
    const externalReference = crypto.randomUUID();
    const [created] = await db.query(
        "INSERT INTO wallet_topups (user_id, amount, external_reference, status) VALUES (?, ?, ?, 'pending')",
        [userId, amount, externalReference]
    );

    try {
        const preferenceClient = new Preference(client);
        const preference = await preferenceClient.create({
            body: {
                items: [{
                    id: `wallet-topup-${created.insertId}`,
                    title: 'Recarga de saldo',
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'ARS'
                }],
                external_reference: externalReference,
                metadata: { wallet_topup_id: String(created.insertId), user_id: String(userId) },
                notification_url: `${webhookUrl}?source_news=webhooks`,
            },
        });
        await db.query('UPDATE wallet_topups SET preference_id = ? WHERE topup_id = ?', [preference.id, created.insertId]);
        return {
            topupId: created.insertId,
            preferenceId: preference.id,
            checkoutUrl: preference.init_point,
            sandboxCheckoutUrl: preference.sandbox_init_point
        };
    } catch (error) {
        console.error('Error al crear la preferencia de pago en Mercado Pago:', error);
        await db.query("UPDATE wallet_topups SET status = 'preference_error' WHERE topup_id = ?", [created.insertId]);
        throw new AppError('No se pudo crear la preferencia de pago con Mercado Pago', 502, 'PAYMENT_PROVIDER_ERROR');
    }
};

export const getTopUps = async (userId, { limit, offset }) => {
    const [rows] = await db.query(
        `SELECT topup_id, amount, status, provider_payment_id, created_at, approved_at
         FROM wallet_topups WHERE user_id = ? ORDER BY topup_id DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    return rows;
};

export const processMercadoPagoPayment = async (paymentId) => {
    const client = getMercadoPagoClient();
    const paymentClient = new Payment(client);
    let payment;
    try {
        payment = await paymentClient.get({ id: paymentId });
    } catch (error) {
        console.error(`Error al consultar el pago ${paymentId} en la API de Mercado Pago:`, error);
        if (error.cause?.statusCode === 404) {
            console.warn(`[SYNC/WEBHOOK] El pago ${paymentId} no fue encontrado en Mercado Pago.`);
            return { ignored: true };
        }
        throw new AppError('No se pudo comunicar con Mercado Pago para obtener el pago', 502, 'PAYMENT_PROVIDER_ERROR');
    }

    const externalReference = payment.external_reference;
    if (!externalReference) return { ignored: true };

    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const [topups] = await connection.query(
            'SELECT topup_id, user_id, amount, provider_payment_id, approved_at FROM wallet_topups WHERE external_reference = ? FOR UPDATE',
            [externalReference]
        );
        if (!topups.length) {
            await connection.commit();
            return { ignored: true };
        }

        const topup = topups[0];
        const providerPaymentId = String(payment.id);
        if (topup.provider_payment_id && topup.provider_payment_id !== providerPaymentId) {
            throw new AppError('El pago recibido no coincide con la recarga', 409, 'PAYMENT_MISMATCH');
        }

        const providerStatus = String(payment.status || 'unknown');
        await connection.query(
            `UPDATE wallet_topups
             SET provider_payment_id = ?, status = ?, provider_payload = ?
             WHERE topup_id = ?`,
            [providerPaymentId, providerStatus, JSON.stringify(payment), topup.topup_id]
        );

        if (providerStatus !== 'approved') {
            await connection.commit();
            return { approved: false, status: providerStatus };
        }

        if (payment.currency_id !== 'ARS' || Number(payment.transaction_amount) !== Number(topup.amount)) {
            throw new AppError('El importe o moneda del pago no coincide con la recarga', 409, 'PAYMENT_MISMATCH');
        }

        // `approved_at`, not the provider's mutable status, is the idempotency marker.
        if (!topup.approved_at) {
            const [users] = await connection.query('SELECT user_id FROM users WHERE user_id = ? FOR UPDATE', [topup.user_id]);
            if (!users.length) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
            await connection.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [topup.amount, topup.user_id]);
            await connection.query(
                "INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id) VALUES (?, ?, 'credit', 'mercadopago_topup', ?)",
                [topup.user_id, topup.amount, topup.topup_id]
            );
            await connection.query("UPDATE wallet_topups SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE topup_id = ?", [topup.topup_id]);
        }
        await connection.commit();
        return { approved: true, topupId: topup.topup_id };
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const checkAndUpdatePayment = async (topupId, userId) => {
    const [topups] = await db.query(
        `SELECT topup_id, user_id, status, provider_payment_id, external_reference
         FROM wallet_topups
         WHERE topup_id = ? AND user_id = ?`,
        [topupId, userId]
    );

    if (!topups.length) {
        throw new AppError('Recarga no encontrada o no te pertenece', 404, 'TOPUP_NOT_FOUND');
    }

    const topup = topups[0];

    if (topup.status === 'approved') {
        return { status: 'approved', message: 'La recarga ya estaba acreditada.' };
    }

    // Si no tenemos un ID de pago (porque el webhook falló), lo buscamos por referencia externa.
    if (!topup.provider_payment_id) {
        if (!topup.external_reference) {
            throw new AppError('La recarga es inválida y no tiene referencia externa para buscar el pago.', 500, 'INVALID_TOPUP_STATE');
        }

        console.log(`[SYNC] La recarga no tiene pago asociado. Buscando por referencia externa ${topup.external_reference}...`);
        const client = getMercadoPagoClient();
        const paymentClient = new Payment(client);

        try {
            const searchResult = await paymentClient.search({ options: { external_reference: topup.external_reference, sort: 'date_created', criteria: 'desc' } });
            const approvedPayment = searchResult.results?.find(p => p.status === 'approved');

            if (!approvedPayment) {
                return { status: topup.status, message: 'No se encontró un pago aprobado para esta recarga en Mercado Pago.' };
            }

            console.log(`[SYNC] Encontrado pago aprobado ${approvedPayment.id}. Procesando...`);
            const result = await processMercadoPagoPayment(approvedPayment.id);

            return result.approved
                ? { status: 'approved', message: 'La recarga ha sido acreditada con éxito tras la búsqueda manual.' }
                : { status: result.status || 'pending', message: `El estado del pago en Mercado Pago es: ${result.status}.` };

        } catch (error) {
            console.error(`[SYNC] Error buscando pago por referencia externa ${topup.external_reference}:`, error);
            throw new AppError('No se pudo comunicar con Mercado Pago para buscar el pago.', 502, 'PAYMENT_PROVIDER_ERROR');
        }
    }

    console.log(`[SYNC] Verificando estado del pago ${topup.provider_payment_id} para la recarga ${topupId}...`);
    const result = await processMercadoPagoPayment(topup.provider_payment_id);

    return result.approved
        ? { status: 'approved', message: 'La recarga ha sido acreditada con éxito.' }
        : { status: result.status || 'pending', message: `El estado del pago en Mercado Pago es: ${result.status}.` };
};
