import { processPurchases } from '../service/marketService.js';
import GetDB from '../config/DB.js';

const getActiveListings = async (req, res) => {
    try {
        const connection = await GetDB.getConnection();
        const [listings] = await connection.query(
            `SELECT ml.listing_id, ml.price, ml.listed_at, i.name, i.description, i.rarity, i.image_url, u.username AS seller_name
            FROM market_listings ml
            INNER JOIN user_inventory ui ON ml.inventory_id = ui.inventory_id
            INNER JOIN items i ON ui.item_id = i.item_id
            INNER JOIN users u ON ml.seller_id = u.user_id
            WHERE ml.status = 'active'`
        );
        connection.release();
        
        res.json(listings);
    } catch (error) {
        console.error('Error en getActiveListings:', error);
        res.status(500).json({ error: 'Error al obtener las publicaciones del mercado' });
    }
};

const createListing = async (req, res) => {
    const sellerId = req.user.userId;
    const { inventoryId, price } = req.body;

    if (!inventoryId || !price || price <= 0) {
        return res.status(400).json({ error: 'Datos inválidos. El precio debe ser mayor a 0.' });
    }

    try {
        const connection = await GetDB.getConnection();

        const [inventoryCheck] = await connection.query(
            'SELECT user_id FROM user_inventory WHERE inventory_id = ?',
            [inventoryId]
        );

        if (inventoryCheck.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'El ítem no existe en el inventario global.' });
        }

        if (inventoryCheck[0].user_id !== sellerId) {
            connection.release();
            return res.status(403).json({ error: 'No tienes permiso para vender un ítem que no te pertenece.' });
        }

        const [activeCheck] = await connection.query(
            'SELECT listing_id FROM market_listings WHERE inventory_id = ? AND status = "active"',
            [inventoryId]
        );

        if (activeCheck.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Este ítem ya se encuentra publicado a la venta.' });
        }

        const [result] = await connection.query(
            'INSERT INTO market_listings (inventory_id, seller_id, price) VALUES (?, ?, ?)',
            [inventoryId, sellerId, price]
        );
        connection.release();

        const io = req.app.get('io');
        if (io) {
            io.emit('new_listing', {
                listingId: result.insertId,
                message: 'Un nuevo ítem ha sido publicado en el mercado.'
            });
        }

        res.status(201).json({
            message: 'Ítem publicado en el mercado con éxito',
            listingId: result.insertId
        });
    } catch (error) {
        console.error('Error en createListing:', error);
        res.status(500).json({ error: 'Error al procesar la publicación en el mercado.' });
    }
};

const buyItem = async (req, res) => {
    const buyerId = req.user.userId;
    const { listingId } = req.params;

    try {
        const result = await processPurchases(buyerId, listingId);

        if (!result.success) {
            if (result.message === 'Oferta no disponible') {
                return res.status(404).json({ error: result.message });
            }
            if (result.message === 'No puedes comprar tu propia oferta' || result.message === 'Fondos insuficientes') {
                return res.status(400).json({ error: result.message });
            }
            return res.status(500).json({ error: result.message });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('item_sold', {
                listingId: listingId, 
                message: 'Este ítem acaba de ser comprado.'
            });
        }

        res.json({ message: result.message });

    } catch (error) {
        console.error('Error en buyItem:', error);
        res.status(500).json({ error: 'Error inesperado en el servidor.' });
    }
};

export default { getActiveListings, createListing, buyItem };