import db from '../config/DB.js';
import crypto from 'crypto';
import AppError from '../shared/errors/AppError.js';
import { getMercadoPagoConfig } from '../config/env.js';

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

const mercadoPagoApi = 'https://api.mercadopago.com';

const requireMercadoPagoConfig = () => {
    const config = getMercadoPagoConfig();
    if (!config.accessToken || !config.webhookUrl) {
        throw new AppError('Mercado Pago no esta configurado en el servidor', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
    }
    return config;
};

const mercadoPagoRequest = async (path, options = {}) => {
    const { accessToken } = requireMercadoPagoConfig();
    const response = await fetch(`${mercadoPagoApi}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error('Mercado Pago API error:', response.status, data);
        throw new AppError('No se pudo comunicar con Mercado Pago', 502, 'PAYMENT_PROVIDER_ERROR');
    }
    return data;
};

export const createTopUpPreference = async (userId, amount) => {
    const { webhookUrl } = requireMercadoPagoConfig();
    const externalReference = crypto.randomUUID();
    const [created] = await db.query(
        "INSERT INTO wallet_topups (user_id, amount, external_reference, status) VALUES (?, ?, ?, 'pending')",
        [userId, amount, externalReference]
    );

    try {
        const preference = await mercadoPagoRequest('/checkout/preferences', {
            method: 'POST',
            body: JSON.stringify({
                items: [{
                    id: `wallet-topup-${created.insertId}`,
                    title: 'Recarga de saldo',
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'ARS'
                }],
                external_reference: externalReference,
                metadata: { wallet_topup_id: String(created.insertId), user_id: String(userId) },
                notification_url: `${webhookUrl}?source_news=webhooks`
            })
        });
        await db.query('UPDATE wallet_topups SET preference_id = ? WHERE topup_id = ?', [preference.id, created.insertId]);
        return {
            topupId: created.insertId,
            preferenceId: preference.id,
            checkoutUrl: preference.init_point,
            sandboxCheckoutUrl: preference.sandbox_init_point
        };
    } catch (error) {
        await db.query("UPDATE wallet_topups SET status = 'preference_error' WHERE topup_id = ?", [created.insertId]);
        throw error;
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
    const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`);
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
