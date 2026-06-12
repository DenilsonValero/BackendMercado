import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authService from '../service/authService.js';

export const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await authService.createUser(username, email, passwordHash);

        res.status(201).json({ message: 'Usuario creado con éxito', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El email o usuario ya existe' });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const users = await authService.getUserByEmail(email);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { userId: user.user_id, username: user.username },
            process.env.JWT_SECRET || 'supersecreto',
            { expiresIn: '1h' }
        );

        res.json({ token, wallet_balance: user.wallet_balance });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const profile = async (req, res) => {
    try {
        const targetUserId = req.params.id || req.user.userId;

        const users = await authService.getUserById(targetUserId);

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        const inventoryCount = await authService.getUserInventoryCount(targetUserId);

        res.json({ ...user, inventory_items: inventoryCount });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el perfil' });
    }
};