import { jest } from '@jest/globals';
import InventoryController from '../src/controllers/InventoryController.js';

describe('InventoryController input validation', () => {
    it('forwards an invalid test item id to the error middleware without accessing the database', async () => {
        const next = jest.fn();
        await InventoryController.claimTestItem({ body: { itemId: '1.5' }, user: { userId: 1 } }, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
    });
});
