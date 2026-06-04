const addBalance = async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.userId; // Este dato viene de tu authMiddleware

    // Validación básica de seguridad
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    try {
        await db.query(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [amount, userId]
        );
        res.json({ message: `Se han acreditado $${amount} a tu cuenta` });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la carga de saldo' });
    }
};

export default { addBalance };