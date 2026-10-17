const { Product, Category } = require('../models');
const { Op } = require('sequelize');

class ProductService {
  async create(data) {
    return await Product.create(data);
  }

  async getAll(filters = {}) {
    const where = {};
    if (filters.search) {
      where.nom = { [Op.iLike]: `%${filters.search}%` };
    }
    if (filters.categorieId) {
      where.categorieId = parseInt(filters.categorieId);
    }
    return await Product.findAll({
      where,
      include: [{ model: Category, as: 'categorie', attributes: ['id', 'nom'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async getById(id) {
    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'categorie', attributes: ['id', 'nom'] }],
    });
    if (!product) {
      const error = new Error('Produit non trouvé');
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  async update(id, data) {
    const product = await this.getById(id);
    return await product.update(data);
  }

  async delete(id) {
    const product = await this.getById(id);
    await product.destroy();
    return { message: 'Produit supprimé avec succès' };
  }
}

module.exports = new ProductService();
