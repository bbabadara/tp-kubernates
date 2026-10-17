import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/api';

const initialFormState = { nom: '', description: '', prix: '', stock: '', categorieId: '' };

function ProductForm({ onSubmit, initialData, onCancel }) {
  const [form, setForm] = useState(initialFormState);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryService.getAll().then((res) => {
      setCategories(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        nom: initialData.nom || '',
        description: initialData.description || '',
        prix: initialData.prix || '',
        stock: initialData.stock ?? '',
        categorieId: initialData.categorieId ?? '',
      });
    } else {
      setForm(initialFormState);
    }
  }, [initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    if (!initialData) setForm(initialFormState);
  };

  return (
    <div className="form-card">
      <h2>{initialData ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nom">Nom</label>
          <input
            id="nom"
            name="nom"
            value={form.nom}
            onChange={handleChange}
            placeholder="Nom du produit"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description du produit"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prix">Prix (€)</label>
            <input
              id="prix"
              name="prix"
              type="number"
              step="0.01"
              min="0"
              value={form.prix}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="categorieId">Catégorie</label>
            <select
              id="categorieId"
              name="categorieId"
              value={form.categorieId}
              onChange={handleChange}
            >
              <option value="">-- Sans catégorie --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {initialData ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
