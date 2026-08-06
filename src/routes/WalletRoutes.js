import express from 'express';
import WalletController from '../controllers/WalletController.js';
import verifyToken from '../middlewares/AuthMiddlewares.js';
import developmentOnly from '../middlewares/developmentOnly.js';

const router = express.Router();

router.post('/add-balance', verifyToken, developmentOnly, WalletController.addBalance);
router.post('/topups', verifyToken, WalletController.createTopUp);
router.get('/topups', verifyToken, WalletController.listTopUps);

export default router;
