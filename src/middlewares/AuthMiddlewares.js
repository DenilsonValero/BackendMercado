import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

const verifyToken = (req, res, next) => {
    const match = req.header('Authorization')?.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const secret = getJwtSecret();
    if (!secret) return next(new Error('JWT_SECRET no está configurado'));

    try {
        req.user = jwt.verify(match[1], secret);
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

export default verifyToken;
