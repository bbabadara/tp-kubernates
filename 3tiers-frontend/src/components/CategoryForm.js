import React, { useState, useEffect } from 'react';

const initialFormState = { nom: '', description: '' };

function CategoryForm({ onSubmit, initialData, onCancel }) {
  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    if (initialData) {
      setForm({
        nom: initialData.nom || '',
        description: initialData.description || '',
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
      <h2>{initialData ? 'Modifier la catégorie' : 'Ajouter une catégorie'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="cat-nom">Nom</label>
          <input
            id="cat-nom"
            name="nom"
            value={form.nom}
            onChange={handleChange}
            placeholder="Nom de la catégorie"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cat-description">Description</label>
          <textarea
            id="cat-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description de la catégorie"
            rows="2"
          />
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

export default CategoryForm;
