import React from 'react';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

function CategoryItem({ category, onEdit, onDelete }) {
  const colorIndex = category.id % CATEGORY_COLORS.length;

  return (
    <div className="category-item">
      <div className="category-info">
        <div className="category-header">
          <span
            className="category-badge"
            style={{ backgroundColor: CATEGORY_COLORS[colorIndex] }}
          >
            {category.nom.charAt(0).toUpperCase()}
          </span>
          <h3 className="category-name">{category.nom}</h3>
        </div>
        {category.description && (
          <p className="category-desc">{category.description}</p>
        )}
        <span className="category-count">
          {category.products ? category.products.length : 0} produit(s)
        </span>
      </div>
      <div className="category-actions">
        <button className="btn btn-sm btn-edit" onClick={() => onEdit(category)}>
          Modifier
        </button>
        <button className="btn btn-sm btn-delete" onClick={() => onDelete(category.id)}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default CategoryItem;
