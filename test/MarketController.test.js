import { jest } from '@jest/globals';
import MarketController from '../src/controllers/MarketController.js';

describe('MarketController input validation', () => {
    it('does not attempt a purchase when the listing id is invalid', async () => {
        const next = jest.fn();
        await MarketController.buyItem({ params: { listingId: 'abc' }, user: { userId: 1 } }, {}, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
    });
});
