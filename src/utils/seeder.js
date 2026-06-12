import GetDB from '../config/DB.js';

const seedItems = async () => {
    const connection = await GetDB.getConnection();
    
    try {
        console.log('⏳ Iniciando la carga de datos iniciales...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE items');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        const itemsToInsert = [
            ['M4A1-S | Terror Nocturno', 'Acabado personalizado con diseños que brillan en la oscuridad.', 'Epic', 'url_imagen_m4a1s'],
            ['AK-47 | Redline', 'Pintura hidrográfica de fibra de carbono con finas líneas rojas.', 'Rare', 'url_imagen_ak47'],
            ['AWP | Dragon Lore', 'Pintado a mano con un dragón escupiendo fuego.', 'Legendary', 'url_imagen_awp'],
            ['Glock-18 | Fade', 'Pintura con aerógrafo utilizando colores transparentes que se desvanecen.', 'Legendary', 'url_imagen_glock']
        ];

        for (const item of itemsToInsert) {
            await connection.query(
                'INSERT INTO items (name, description, rarity, image_url) VALUES (?, ?, ?, ?)',
                item
            );
        }

        console.log('✅ Catálogo de ítems poblado con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al poblar la base de datos:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
};

seedItems();