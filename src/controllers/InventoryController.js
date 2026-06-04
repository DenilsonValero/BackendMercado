import db from '../config/db.js';

const getUserInventory = async (req, res) => {
    const userId = req.user.userId; 

    try {
        const [inventory] = await db.query(
            `SELECT ui.inventory_id, ui.acquired_at, i.item_id, i.name, i.description, i.rarity, i.image_url 
                FROM user_inventory ui
                INNER JOIN items i ON ui.item_id = i.item_id
                WHERE ui.user_id = ?`,
            [userId]
        );

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
};


const claimTestItem = async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.body; 

    if (!itemId) {
        return res.status(400).json({ error: 'Debe especificar el item_id' });
    }

    try {
        const [itemExists] = await db.query('SELECT item_id FROM items WHERE item_id = ?', [itemId]);
        if (itemExists.length === 0) {
            return res.status(404).json({ error: 'El ítem especificado no existe en el catálogo global' });
        }

        const [result] = await db.query(
            'INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)',
            [userId, itemId]
        );

        res.status(201).json({ 
            message: 'Ítem añadido al inventario con éxito', 
            inventoryId: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al añadir el ítem al inventario' });
    }
};

export default { getUserInventory, claimTestItem };