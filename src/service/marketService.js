import GetDB from "../config/DB";

const processPurchases = async (buyerId, ListingId) => {
    const connection = await GetDB.getConnection();
    try {
        await connection.beginTransaction();
        const [listing] = await connection.query('SELECT * FROM market_listings WHERE listing_id = ? AND status = "active" FOR UPDATE', 
            [listingId]);
            if (listing.length === 0) {
                throw new Error('Oferta no disponible');
            }
            const{ price, seller_id ,inventory_id} = listing[0];
            const [buyer] = await connection.query('SELECT wallet_balance FROM users WHERE user_id = ?', [buyerId]);
            if (buyer[0].wallet_balance < price) {
                throw new Error('Fondos insuficientes');
            }
            await connection.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [price, buyerId]);
            await connection.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [price, seller_id]);

            await connection.query('UPDATE inventory SET user_id = ? WHERE inventory_id = ?', [buyerId, inventory_id]);

            await connection.query('UPDATE market_listings SET status = "sold" WHERE listing_id = ?', [listingId]);

            await connection.query('INSERT INTO transactions (listing_id, buyer_id, seller_id, amount) VALUES (?, ?, ?, ?)',[listingId, buyerId, seller_id, price]);
            
            await connection.commit();
            return { success: true, message: 'Compra realizada con éxito' };
    } catch (error) {
        console.error('❌ Error al iniciar la transacción:', error.message);
        await connection.rollback();
        throw error;
        return { success: false, message: error.message };
    } finally {
        connection.release();

    }
};