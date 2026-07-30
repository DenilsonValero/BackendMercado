import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authService from '../service/authService.js';
import { getJwtSecret } from '../config/env.js';
import AppError from '../shared/errors/AppError.js';
import { positiveId, requiredString } from '../shared/validation.js';

const usernameRule = /^[a-zA-Z0-9_]+$/;
const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res, next) => {
    try {
        const username = requiredString(req.body.username, 'username', { min: 3, max: 30, pattern: usernameRule });
        const email = requiredString(req.body.email, 'email', { max: 254, pattern: emailRule }).toLowerCase();
        const password = requiredString(req.body.password, 'password', { min: 8, max: 128 });
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await authService.createUser(username, email, passwordHash);
        res.status(201).json({ message: 'Usuario creado con éxito', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email o usuario ya existe', code: 'DUPLICATE_USER' });
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const email = requiredString(req.body.email, 'email', { max: 254, pattern: emailRule }).toLowerCase();
        const password = requiredString(req.body.password, 'password', { min: 1, max: 128 });
        const user = (await authService.getUserByEmail(email))[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
        const secret = getJwtSecret();
        if (!secret) throw new Error('JWT_SECRET no está configurado');
        const token = jwt.sign({ userId: user.user_id, username: user.username }, secret, { expiresIn: '1h' });
        res.json({ token, wallet_balance: user.wallet_balance });
    } catch (error) {
        next(error);
    }
};

export const profile = async (req, res, next) => {
    try {
        const user = (await authService.getUserById(req.user.userId))[0];
        if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        const inventoryCount = await authService.getUserInventoryCount(req.user.userId);
        res.json({ ...user, inventory_items: inventoryCount });
    } catch (error) {
        next(error);
    }
};

export const publicProfile = async (req, res, next) => {
    try {
        const userId = positiveId(req.params.id, 'id');
        const user = (await authService.getPublicUserById(userId))[0];
        if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        res.json(user);
    } catch (error) {
        next(error);
    }
};
