import express from 'express';
const router = express.Router();
import InventoryController from '../controllers/InventoryController.js';
import verifyToken from '../middlewares/AuthMiddlewares.js';


router.get('/', verifyToken, InventoryController.getUserInventory);
router.post('/claim-test', verifyToken, InventoryController.claimTestItem);

export default router;