const { Category } = require('../models');

class CategoryService {
  async create(data) {
    return await Category.create(data);
  }

  async getAll() {
    return await Category.findAll({ order: [['nom', 'ASC']] });
  }

  async getById(id) {
    const category = await Category.findByPk(id);
    if (!category) {
      const error = new Error('Catégorie non trouvée');
      error.statusCode = 404;
      throw error;
    }
    return category;
  }

  async update(id, data) {
    const category = await this.getById(id);
    return await category.update(data);
  }

  async delete(id) {
    const category = await this.getById(id);
    await category.destroy();
    return { message: 'Catégorie supprimée avec succès' };
  }
}

module.exports = new CategoryService();
