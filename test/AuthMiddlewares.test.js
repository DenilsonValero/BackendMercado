import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import verifyToken from '../src/middlewares/AuthMiddlewares.js';

describe('verifyToken', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        process.env.JWT_SECRET = 'test_secret_that_is_long_enough_for_tests';
        req = { header: jest.fn() };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.restoreAllMocks();
    });

    it('attaches verified token data to the request', () => {
        req.header.mockReturnValue('Bearer valid_token');
        jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 1, username: 'test' });

        verifyToken(req, res, next);

        expect(req.user).toEqual({ userId: 1, username: 'test' });
        expect(next).toHaveBeenCalledWith();
    });

    it('rejects malformed or invalid authorization headers with 401', () => {
        req.header.mockReturnValue('Basic abc');
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);

        req.header.mockReturnValue('Bearer invalid');
        jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('invalid'); });
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
