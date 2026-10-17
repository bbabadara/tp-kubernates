import React, { useState, useEffect } from 'react';
import ProductItem from './ProductItem';
import { categoryService } from '../services/api';

function ProductList({ products, onEdit, onDelete, onFilter }) {
  const [search, setSearch] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryService.getAll().then((res) => {
      setCategories(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    onFilter({ search, categorieId });
  }, [search, categorieId, onFilter]);

  if (products.length === 0) {
    return (
      <div>
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">&#x1F50D;</span>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nom}</option>
            ))}
          </select>
        </div>
        <div className="empty-state">
          <p>Aucun produit trouvé.</p>
          <p>Ajoutez votre premier produit avec le formulaire ci-dessus.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">&#x1F50D;</span>
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nom}</option>
          ))}
        </select>
      </div>
      <h2>Liste des produits ({products.length})</h2>
      {products.map((product) => (
        <ProductItem
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ProductList;
