import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }


    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecreto');
        req.user = verified; 
        next(); 
    } catch (error) {
        res.status(400).json({ error: 'Token inválido o expirado' });
    }
};

export default verifyToken;