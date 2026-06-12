import { processPurchases } from '../service/marketService.js'; // Ajustado a ES Modules y a tu estructura real

const getActiveListings = async (req, res) => {
    res.status(501).json({ error: 'Endpoint getActiveListings no implementado aún' });
};

const createListing = async (req, res) => {
    res.status(501).json({ error: 'Endpoint createListing no implementado aún' });
};

const buyItem = async (req, res) => {
    const buyerId = req.user.userId; 
    const { listingId } = req.params; 

    try {
        // Ejecutamos tu servicio
        const result = await processPurchases(buyerId, listingId);


        if (!result.success) {
            if (result.message === 'Oferta no disponible') {
                return res.status(404).json({ error: result.message });
            }
            if (result.message === 'No puedes comprar tu propia oferta') {
                return res.status(400).json({ error: result.message });
            }
            if (result.message === 'Fondos insuficientes') {
                return res.status(400).json({ error: result.message });
            }
            return res.status(500).json({ error: result.message });
        }
        res.json({ message: result.message });

    } catch (error) {
        res.status(500).json({ error: 'Error inesperado en el servidor.' });
    }
};

export default { buyItem, getActiveListings, createListing };
