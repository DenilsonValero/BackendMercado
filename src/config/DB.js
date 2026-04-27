import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const GetDB = pool.promise();

// Comprobamos la conexión inmediatamente después de crear el pool
(async () => {
    try {
        // Solicitamos una conexión de prueba
        const connection = await GetDB.getConnection();
        console.log('📦 Conectado con exito ');
        
        // ¡Importante! Liberamos la conexión para que vuelva al pool
        connection.release(); 
    } catch (error) {
        console.error('❌ Error al conectar :', error.message);
    }
})();

export default GetDB;