import React from 'react';
import CategoryItem from './CategoryItem';

function CategoryList({ categories, onEdit, onDelete }) {
  if (categories.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune catégorie trouvée.</p>
        <p>Ajoutez votre première catégorie avec le formulaire ci-dessus.</p>
      </div>
    );
  }

  return (
    <div className="category-list">
      <h2>Liste des catégories ({categories.length})</h2>
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default CategoryList;
