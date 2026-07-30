import db from '../config/DB.js';
import AppError from '../shared/errors/AppError.js';

const getUserInventory = async (userId) => {
    const [inventory] = await db.query(
        `SELECT ui.inventory_id, ui.acquired_at, i.item_id, i.name, i.description, i.rarity, i.image_url,
                ml.listing_id, ml.price AS listed_price
         FROM user_inventory ui
         INNER JOIN items i ON ui.item_id = i.item_id
         LEFT JOIN market_listings ml ON ml.inventory_id = ui.inventory_id AND ml.status = 'active'
         WHERE ui.user_id = ?`,
        [userId]
    );
    return inventory;
};

const claimTestItem = async (userId, itemId) => {
    const [item] = await db.query('SELECT item_id FROM items WHERE item_id = ?', [itemId]);
    if (!item.length) throw new AppError('El ítem especificado no existe en el catálogo global', 404, 'ITEM_NOT_FOUND');
    const [result] = await db.query('INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)', [userId, itemId]);
    return result.insertId;
};

export default { getUserInventory, claimTestItem };
