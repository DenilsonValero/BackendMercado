import { jest } from '@jest/globals';
import WalletController from '../src/controllers/WalletController.js';

describe('WalletController input validation', () => {
    it('rejects zero, negative and over-precise amounts', async () => {
        for (const amount of [0, -1, '1.234']) {
            const next = jest.fn();
            await WalletController.addBalance({ body: { amount }, user: { userId: 1 } }, {}, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
        }
    });
});
