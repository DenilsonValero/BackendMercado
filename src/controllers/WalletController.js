import { money, pagination } from '../shared/validation.js';
import { creditTestBalance, createTopUpPreference, getTopUps } from '../service/walletService.js';

const addBalance = async (req, res, next) => {
    try {
        const amount = money(req.body.amount, 'amount');
        await creditTestBalance(req.user.userId, amount);
        res.json({ message: `Se han acreditado $${amount} a tu cuenta` });
    } catch (error) {
        next(error);
    }
};

const createTopUp = async (req, res, next) => {
    try {
        const amount = money(req.body.amount, 'amount');
        const preference = await createTopUpPreference(req.user.userId, amount);
        res.status(201).json({ message: 'Preferencia de pago creada', ...preference });
    } catch (error) {
        next(error);
    }
};

const listTopUps = async (req, res, next) => {
    try {
        res.json({ data: await getTopUps(req.user.userId, pagination(req.query)) });
    } catch (error) {
        next(error);
    }
};

export default { addBalance, createTopUp, listTopUps };
