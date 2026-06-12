import GetDB from '../config/DB.js';

const getUserByEmail = async (email) => {
    const connection = await GetDB.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows;
    } finally {
        connection.release();
    }
};

const getUserByUsername = async (username) => {
    const connection = await GetDB.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
        return rows;
    } finally {
        connection.release();
    }
};

const createUser = async (username, email, passwordHash) => {
    const connection = await GetDB.getConnection();
    try {
        const [result] = await connection.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );
        return result;
    } finally {
        connection.release();
    }
};

const getUserById = async (userId) => {
    const connection = await GetDB.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT user_id, username, email, wallet_balance, created_at FROM users WHERE user_id = ?',
            [userId]
        );
        return rows;
    } finally {
        connection.release();
    }
};

const getUserInventoryCount = async (userId) => {
    const connection = await GetDB.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT COUNT(*) as count FROM user_inventory WHERE user_id = ?',
            [userId]
        );
        return rows[0].count;
    } finally {
        connection.release();
    }
};

export default {
    getUserByEmail,
    getUserByUsername,
    createUser,
    getUserById,
    getUserInventoryCount
};