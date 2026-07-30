import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

const requiredInProduction = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'CORS_ORIGIN'];

export const validateEnvironment = () => {
    if (process.env.NODE_ENV === 'test') return;

    if (!process.env.JWT_SECRET) {
        throw new Error('Falta la variable de entorno obligatoria: JWT_SECRET');
    }

    if (!isProduction) return;

    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
    }

    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
};

export const getAllowedOrigins = () => {
    const configuredOrigins = process.env.CORS_ORIGIN
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configuredOrigins?.length) return configuredOrigins;
    return isProduction ? [] : true;
};

export const getJwtSecret = () => process.env.JWT_SECRET;
