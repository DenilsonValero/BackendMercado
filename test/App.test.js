import request from 'supertest';
import app from '../src/app.js';

describe('HTTP application', () => {
    it('exposes a health response without opening a server port', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ service: 'Marketplace API', status: 'ok' });
    });

    it('returns a consistent 404 error for unknown routes', async () => {
        const response = await request(app).get('/does-not-exist');
        expect(response.status).toBe(404);
        expect(response.body.code).toBe('NOT_FOUND');
    });
});
