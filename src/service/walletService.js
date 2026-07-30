import db from '../config/DB.js';
import AppError from '../shared/errors/AppError.js';

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
