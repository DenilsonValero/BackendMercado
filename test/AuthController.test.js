import { jest } from '@jest/globals';
import { register } from '../src/controllers/AuthController.js';

describe('AuthController input validation', () => {
    it('rejects weak passwords before creating a user', async () => {
        const next = jest.fn();
        await register({ body: { username: 'valid_user', email: 'user@example.com', password: 'short' } }, {}, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
    });
});
