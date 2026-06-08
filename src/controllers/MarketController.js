import { processPurchases } from '../service/marketService.js'; // Ajustado a ES Modules y a tu estructura real

const buyItem = async (req, res) => {
    const buyerId = req.user.userId; 
    const { listingId } = req.params; 

    try {
        // Ejecutamos tu servicio
        const result = await processPurchases(buyerId, listingId);

        // Evaluamos la respuesta que armaste
        if (!result.success) {
            // Dependiendo del mensaje, devolvemos un 400 (Bad Request) o 404 (Not Found)
            if (result.message === 'Oferta no disponible') {
                return res.status(404).json({ error: result.message });
            }
            if (result.message === 'No puedes comprar tu propia oferta') {
                return res.status(400).json({ error: result.message });
            }
            if (result.message === 'Fondos insuficientes') {
                return res.status(400).json({ error: result.message });
            }
            // Cualquier otro error interno capturado en tu catch
            return res.status(500).json({ error: result.message });
        }

        // Si success es true
        res.json({ message: result.message });

    } catch (error) {
        // Este catch ahora solo atraparía errores ajenos a la transacción (ej. problemas de red severos)
        res.status(500).json({ error: 'Error inesperado en el servidor.' });
    }
};

export default { buyItem };
