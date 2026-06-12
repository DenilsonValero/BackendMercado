import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/AuthRouters.js';
import marketRoutes from './routes/MarketRoutes.js';
import inventoryRoutes from './routes/InventoryRoutes.js';
/* import walletRoutes from './routes/WalletRoutes.js'; */

dotenv.config();    

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/inventory', inventoryRoutes);
/* app.use('/api/wallet', walletRoutes); */

app.get('/', (req, res) => {
    res.send('Servidor Market Iniciado');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

export default app;