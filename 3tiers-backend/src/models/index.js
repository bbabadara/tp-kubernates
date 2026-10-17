const sequelize = require('../config/sequelize');
const Product = require('./Product');
const Category = require('./Category');

Product.belongsTo(Category, { foreignKey: 'categorieId', as: 'categorie' });
Category.hasMany(Product, { foreignKey: 'categorieId', as: 'products' });

const db = {
  sequelize,
  Product,
  Category,
};

module.exports = db;
