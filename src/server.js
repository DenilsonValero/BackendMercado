import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { getAllowedOrigins, validateEnvironment } from './config/env.js';

validateEnvironment();

const port = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: getAllowedOrigins(), methods: ['GET', 'POST'] }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`Cliente Socket.IO conectado: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Cliente Socket.IO desconectado: ${socket.id}`));
});

httpServer.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

const shutdown = (signal) => {
    console.log(`${signal} recibido; cerrando servidor.`);
    httpServer.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { httpServer, io };
