import db from '../config/DB.js';

const itemsToInsert = [
    ['M4A1-S | Terror Nocturno', 'Acabado personalizado con diseños que brillan en la oscuridad.', 'Epic', 'url_imagen_m4a1s'],
    ['AK-47 | Redline', 'Pintura hidrográfica de fibra de carbono con finas líneas rojas.', 'Rare', 'url_imagen_ak47'],
    ['AWP | Dragon Lore', 'Pintado a mano con un dragón escupiendo fuego.', 'Legendary', 'url_imagen_awp'],
    ['Glock-18 | Fade', 'Pintura con aerógrafo utilizando colores transparentes que se desvanecen.', 'Legendary', 'url_imagen_glock']
];

const seedItems = async () => {
    const connection = await db.getConnection();
    try {
        for (const item of itemsToInsert) {
            await connection.query(
                `INSERT INTO items (name, description, rarity, image_url) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE description = VALUES(description), rarity = VALUES(rarity), image_url = VALUES(image_url)`,
                item
            );
        }
        console.log('Catálogo de ítems actualizado con éxito.');
    } finally {
        connection.release();
    }
};

seedItems().catch((error) => {
    console.error('Error al poblar la base de datos:', error);
    process.exitCode = 1;
});
