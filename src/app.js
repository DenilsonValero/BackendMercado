import express from 'express';
import cors from 'cors';
import authRoutes from './routes/AuthRouters.js';
import marketRoutes from './routes/MarketRoutes.js';
import inventoryRoutes from './routes/InventoryRoutes.js';
import walletRoutes from './routes/WalletRoutes.js';
import webhookRoutes from './routes/WebhookRoutes.js';
import { getAllowedOrigins } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors({ origin: getAllowedOrigins(), methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
    res.json({ service: 'Marketplace API', status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
