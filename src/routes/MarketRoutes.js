import express from 'express';
import MarketController from '../controllers/MarketController.js';
import verifyToken from '../middlewares/AuthMiddlewares.js';

const router = express.Router();

router.get('/', MarketController.getActiveListings);
router.post('/sell', verifyToken, MarketController.createListing);
router.post('/buy/:listingId', verifyToken, MarketController.buyItem);

export default router;