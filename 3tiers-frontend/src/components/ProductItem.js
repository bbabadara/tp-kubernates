import React from 'react';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

function ProductItem({ product, onEdit, onDelete }) {
  return (
    <div className="product-item">
      <div className="product-info">
        <div className="product-name-row">
          <h3 className="product-name">{product.nom}</h3>
          {product.categorie && (
            <span
              className="product-category-badge"
              style={{ backgroundColor: CATEGORY_COLORS[product.categorie.id % CATEGORY_COLORS.length] }}
            >
              {product.categorie.nom}
            </span>
          )}
        </div>
        {product.description && (
          <p className="product-desc">{product.description}</p>
        )}
        <div className="product-meta">
          <span className="product-price">{parseFloat(product.prix).toFixed(2)} €</span>
          <span className="product-stock">Stock: {product.stock}</span>
          <span className="product-date">
            {new Date(product.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>
      <div className="product-actions">
        <button className="btn btn-sm btn-edit" onClick={() => onEdit(product)}>
          Modifier
        </button>
        <button className="btn btn-sm btn-delete" onClick={() => onDelete(product.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default ProductItem;
