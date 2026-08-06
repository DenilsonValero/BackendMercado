import express from 'express';
import WebhookController from '../controllers/WebhookController.js';

const router = express.Router();
router.post('/mercadopago', WebhookController.receiveMercadoPago);

export default router;
