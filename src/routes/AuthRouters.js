import express from 'express';
import { register, login, profile } from '../controllers/AuthController.js';
import verifyToken from '../middlewares/AuthMiddlewares.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, profile);
router.get('/profile/:id', verifyToken, profile);

export default router;