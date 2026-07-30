import AppError from './errors/AppError.js';

export const requiredString = (value, field, { min = 1, max = 255, pattern } = {}) => {
    if (typeof value !== 'string') throw new AppError(`${field} es obligatorio`, 400, 'VALIDATION_ERROR');
    const normalized = value.trim();
    if (normalized.length < min || normalized.length > max || (pattern && !pattern.test(normalized))) {
        throw new AppError(`${field} tiene un formato inválido`, 400, 'VALIDATION_ERROR');
    }
    return normalized;
};

export const positiveId = (value, field = 'id') => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(`${field} debe ser un entero positivo`, 400, 'VALIDATION_ERROR');
    }
    return id;
};

export const money = (value, field = 'amount') => {
    const normalized = typeof value === 'number' ? value.toFixed(2) : String(value ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
        throw new AppError(`${field} debe ser un monto positivo con hasta dos decimales`, 400, 'VALIDATION_ERROR');
    }
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
        throw new AppError(`${field} debe ser mayor a 0 y no superar 1000000`, 400, 'VALIDATION_ERROR');
    }
    return amount.toFixed(2);
};

export const pagination = (query) => {
    const page = query.page === undefined ? 1 : positiveId(query.page, 'page');
    const limit = query.limit === undefined ? 20 : positiveId(query.limit, 'limit');
    if (limit > 100) throw new AppError('limit no puede superar 100', 400, 'VALIDATION_ERROR');
    return { page, limit, offset: (page - 1) * limit };
};
