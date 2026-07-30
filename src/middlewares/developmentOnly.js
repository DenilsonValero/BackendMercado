import AppError from '../shared/errors/AppError.js';

export default (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return next(new AppError('Esta operación sólo está disponible fuera de producción', 403, 'FORBIDDEN'));
    }
    next();
};
