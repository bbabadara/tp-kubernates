const categoryService = require('../services/categoryService');
const categoryValidator = require('../validators/categoryValidator');

class CategoryController {
  async create(req, res, next) {
    try {
      const errors = categoryValidator.validateCreate(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const category = await categoryService.create({
        nom: req.body.nom,
        description: req.body.description || null,
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const categories = await categoryService.getAll();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const errors = categoryValidator.validateUpdate(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const updateData = {};
      if (req.body.nom !== undefined) updateData.nom = req.body.nom;
      if (req.body.description !== undefined) updateData.description = req.body.description;

      const category = await categoryService.update(req.params.id, updateData);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await categoryService.delete(req.params.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
