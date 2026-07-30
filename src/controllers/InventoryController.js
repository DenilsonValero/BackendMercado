import inventoryService from '../service/inventoryService.js';
import { positiveId } from '../shared/validation.js';

const getUserInventory = async (req, res, next) => {
    try {
        res.json(await inventoryService.getUserInventory(req.user.userId));
    } catch (error) {
        next(error);
    }
};

const claimTestItem = async (req, res, next) => {
    try {
        const inventoryId = await inventoryService.claimTestItem(req.user.userId, positiveId(req.body.itemId, 'itemId'));
        res.status(201).json({ message: 'Ítem añadido al inventario con éxito', inventoryId });
    } catch (error) {
        next(error);
    }
};

export default { getUserInventory, claimTestItem };
