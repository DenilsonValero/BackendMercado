import AppError from '../shared/errors/AppError.js';

export const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' });
};

export const errorHandler = (error, req, res, next) => {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';

    if (statusCode >= 500) {
        console.error(error);
    }

    res.status(statusCode).json({
        error: statusCode >= 500 ? 'Error interno del servidor' : error.message,
        code
    });
};
