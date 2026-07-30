import { money } from '../shared/validation.js';
import { creditTestBalance } from '../service/walletService.js';

const addBalance = async (req, res, next) => {
    try {
        const amount = money(req.body.amount, 'amount');
        await creditTestBalance(req.user.userId, amount);
        res.json({ message: `Se han acreditado $${amount} a tu cuenta` });
    } catch (error) {
        next(error);
    }
};

export default { addBalance };
