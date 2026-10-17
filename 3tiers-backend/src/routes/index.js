const { Router } = require('express');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');

const router = Router();

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
