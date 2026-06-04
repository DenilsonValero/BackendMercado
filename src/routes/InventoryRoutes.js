import express from 'express';
const router = express.Router();
import { getUserInventory, claimTestItem } from '../controllers/InventoryController.js';
import { verifyToken } from '../middleware/authMiddleware.js';


router.get('/', verifyToken, getUserInventory);
router.post('/claim-test', verifyToken, claimTestItem);

export default router;