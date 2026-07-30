import { cancelListing, createListing, getActiveListings, getUserTransactions, purchaseListing } from '../service/marketService.js';
import { money, pagination, positiveId } from '../shared/validation.js';

const getListings = async (req, res, next) => {
    try {
        const paging = pagination(req.query);
        const { listings, total } = await getActiveListings(paging);
        res.json({ data: listings, pagination: { page: paging.page, limit: paging.limit, total } });
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const listingId = await createListing(req.user.userId, positiveId(req.body.inventoryId, 'inventoryId'), money(req.body.price, 'price'));
        req.app.get('io')?.emit('new_listing', { listingId, message: 'Un nuevo ítem ha sido publicado en el mercado.' });
        res.status(201).json({ message: 'Ítem publicado en el mercado con éxito', listingId });
    } catch (error) {
        next(error);
    }
};

const buy = async (req, res, next) => {
    try {
        const listingId = positiveId(req.params.listingId, 'listingId');
        await purchaseListing(req.user.userId, listingId);
        req.app.get('io')?.emit('item_sold', { listingId, message: 'Este ítem acaba de ser comprado.' });
        res.json({ message: 'Compra realizada con éxito' });
    } catch (error) {
        next(error);
    }
};

const cancel = async (req, res, next) => {
    try {
        const listingId = positiveId(req.params.listingId, 'listingId');
        await cancelListing(req.user.userId, listingId);
        req.app.get('io')?.emit('listing_cancelled', { listingId });
        res.json({ message: 'Oferta cancelada con éxito' });
    } catch (error) {
        next(error);
    }
};

const history = async (req, res, next) => {
    try {
        res.json({ data: await getUserTransactions(req.user.userId, pagination(req.query)) });
    } catch (error) {
        next(error);
    }
};

export default { getActiveListings: getListings, createListing: create, buyItem: buy, cancelListing: cancel, getHistory: history };
