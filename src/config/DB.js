import mysql from 'mysql2';
import './env.js';

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

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            const connection = await GetDB.getConnection();
            console.log('📦 Conectado con exito ');
            
            connection.release(); 
        } catch (error) {
            console.error('❌ Error al conectar :', error.message);
        }
    })();
}

export default GetDB;
