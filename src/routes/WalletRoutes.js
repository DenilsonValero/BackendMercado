import express from 'express';
import WalletController from '../controllers/WalletController.js';
import verifyToken from '../middlewares/AuthMiddlewares.js';

const router = express.Router();

router.post('/add-balance', verifyToken, WalletController.addBalance);

export default router;