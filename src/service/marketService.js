import db from '../config/DB.js';
import AppError from '../shared/errors/AppError.js';

const getActiveListings = async ({ limit, offset }) => {
    const [listings] = await db.query(
        `SELECT ml.listing_id, ml.price, ml.listed_at, ui.inventory_id, i.item_id, i.name, i.description,
                i.rarity, i.image_url, u.username AS seller_name
         FROM market_listings ml
         INNER JOIN user_inventory ui ON ml.inventory_id = ui.inventory_id
         INNER JOIN items i ON ui.item_id = i.item_id
         INNER JOIN users u ON ml.seller_id = u.user_id
         WHERE ml.status = 'active'
         ORDER BY ml.listed_at DESC, ml.listing_id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM market_listings WHERE status = 'active'");
    return { listings, total };
};

const createListing = async (sellerId, inventoryId, price) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const [inventory] = await connection.query(
            'SELECT inventory_id, user_id FROM user_inventory WHERE inventory_id = ? FOR UPDATE',
            [inventoryId]
        );
        if (!inventory.length) throw new AppError('El ítem no existe en el inventario global', 404, 'INVENTORY_NOT_FOUND');
        if (inventory[0].user_id !== sellerId) throw new AppError('No tienes permiso para vender un ítem que no te pertenece', 403, 'FORBIDDEN');

        const [activeListings] = await connection.query(
            "SELECT listing_id FROM market_listings WHERE inventory_id = ? AND status = 'active' FOR UPDATE",
            [inventoryId]
        );
        if (activeListings.length) throw new AppError('Este ítem ya se encuentra publicado a la venta', 409, 'LISTING_ALREADY_ACTIVE');

        const [result] = await connection.query(
            'INSERT INTO market_listings (inventory_id, seller_id, price) VALUES (?, ?, ?)',
            [inventoryId, sellerId, price]
        );
        await connection.commit();
        return result.insertId;
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') throw new AppError('Este ítem ya se encuentra publicado a la venta', 409, 'LISTING_ALREADY_ACTIVE');
        throw error;
    } finally {
        connection.release();
    }
};

const purchaseListing = async (buyerId, listingId) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const [listings] = await connection.query(
            "SELECT listing_id, price, seller_id, inventory_id FROM market_listings WHERE listing_id = ? AND status = 'active' FOR UPDATE",
            [listingId]
        );
        if (!listings.length) throw new AppError('Oferta no disponible', 404, 'LISTING_NOT_FOUND');
        const listing = listings[0];
        if (listing.seller_id === buyerId) throw new AppError('No puedes comprar tu propia oferta', 400, 'OWN_LISTING');

        // Lock both wallets in a deterministic order. This prevents double-spending and reduces deadlocks.
        const [users] = await connection.query(
            'SELECT user_id, wallet_balance FROM users WHERE user_id IN (?, ?) ORDER BY user_id FOR UPDATE',
            [buyerId, listing.seller_id]
        );
        const buyer = users.find((user) => user.user_id === buyerId);
        if (!buyer) throw new AppError('Usuario comprador no encontrado', 404, 'USER_NOT_FOUND');
        if (Number(buyer.wallet_balance) < Number(listing.price)) throw new AppError('Fondos insuficientes', 400, 'INSUFFICIENT_FUNDS');

        const [inventoryUpdate] = await connection.query(
            'UPDATE user_inventory SET user_id = ? WHERE inventory_id = ? AND user_id = ?',
            [buyerId, listing.inventory_id, listing.seller_id]
        );
        if (inventoryUpdate.affectedRows !== 1) throw new AppError('El ítem ya no pertenece al vendedor', 409, 'INVENTORY_OWNERSHIP_CHANGED');

        await connection.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [listing.price, buyerId]);
        await connection.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [listing.price, listing.seller_id]);
        await connection.query("UPDATE market_listings SET status = 'sold', sold_at = CURRENT_TIMESTAMP WHERE listing_id = ?", [listingId]);
        await connection.query(
            'INSERT INTO transactions (listing_id, buyer_id, seller_id, amount) VALUES (?, ?, ?, ?)',
            [listingId, buyerId, listing.seller_id, listing.price]
        );
        await connection.query(
            "INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id) VALUES (?, ?, 'debit', 'purchase', ?), (?, ?, 'credit', 'sale', ?)",
            [buyerId, listing.price, listingId, listing.seller_id, listing.price, listingId]
        );
        await connection.commit();
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const cancelListing = async (sellerId, listingId) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const [listings] = await connection.query(
            "SELECT seller_id FROM market_listings WHERE listing_id = ? AND status = 'active' FOR UPDATE",
            [listingId]
        );
        if (!listings.length) throw new AppError('Oferta no disponible', 404, 'LISTING_NOT_FOUND');
        if (listings[0].seller_id !== sellerId) throw new AppError('No tienes permiso para cancelar esta oferta', 403, 'FORBIDDEN');
        await connection.query("UPDATE market_listings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE listing_id = ?", [listingId]);
        await connection.commit();
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getUserTransactions = async (userId, { limit, offset }) => {
    const [transactions] = await db.query(
        `SELECT t.transaction_id, t.listing_id, t.amount, t.transaction_date, t.buyer_id, t.seller_id,
                i.name AS item_name
         FROM transactions t
         INNER JOIN market_listings ml ON ml.listing_id = t.listing_id
         INNER JOIN user_inventory ui ON ui.inventory_id = ml.inventory_id
         INNER JOIN items i ON i.item_id = ui.item_id
         WHERE t.buyer_id = ? OR t.seller_id = ?
         ORDER BY t.transaction_date DESC, t.transaction_id DESC LIMIT ? OFFSET ?`,
        [userId, userId, limit, offset]
    );
    return transactions;
};

export { getActiveListings, createListing, purchaseListing, cancelListing, getUserTransactions };
