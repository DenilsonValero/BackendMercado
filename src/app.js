import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/AuthRouters.js';
import marketRoutes from './routes/MarketRoutes.js';
import inventoryRoutes from './routes/InventoryRoutes.js';
import walletRoutes from './routes/WalletRoutes.js'; // Importamos las nuevas rutas

dotenv.config();    

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/wallet', walletRoutes); // Usamos las rutas de la billetera

app.get('/', (req, res) => {
    res.send('Servidor Marketplace Iniciado 🚀');
});

// ¡IMPORTANTE! Ahora encendemos el httpServer, no la app de express
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

export default app;