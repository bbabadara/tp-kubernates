const productService = require('../services/productService');
const productValidator = require('../validators/productValidator');

class ProductController {
  async create(req, res, next) {
    try {
      const errors = productValidator.validateCreate(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const product = await productService.create({
        nom: req.body.nom,
        description: req.body.description || null,
        prix: parseFloat(req.body.prix),
        stock: req.body.stock !== undefined ? parseInt(req.body.stock) : 0,
        categorieId: req.body.categorieId ? parseInt(req.body.categorieId) : null,
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const products = await productService.getAll(req.query);
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const errors = productValidator.validateUpdate(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const updateData = {};
      if (req.body.nom !== undefined) updateData.nom = req.body.nom;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.prix !== undefined) updateData.prix = parseFloat(req.body.prix);
      if (req.body.stock !== undefined) updateData.stock = parseInt(req.body.stock);
      if (req.body.categorieId !== undefined) updateData.categorieId = req.body.categorieId ? parseInt(req.body.categorieId) : null;

      const product = await productService.update(req.params.id, updateData);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await productService.delete(req.params.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
