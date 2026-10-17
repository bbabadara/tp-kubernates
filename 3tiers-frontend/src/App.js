import React, { useState, useEffect, useCallback } from 'react';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import { productService, categoryService } from './services/api';
import './App.css';

function App() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (f = filters) => {
    try {
      const params = {};
      if (f.search) params.search = f.search;
      if (f.categorieId) params.categorieId = f.categorieId;
      const response = await productService.getAll(params);
      setProducts(response.data.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des produits');
    }
  }, [filters]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAll();
      setCategories(response.data.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des catégories');
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (tab === 'categories') fetchCategories();
  }, [tab, fetchCategories]);

  const handleFilter = useCallback((f) => {
    setFilters(f);
  }, []);

  const handleCreateProduct = async (data) => {
    try {
      await productService.create(data);
      await fetchProducts();
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || 'Erreur lors de la création';
      setError(msg);
    }
  };

  const handleUpdateProduct = async (id, data) => {
    try {
      await productService.update(id, data);
      await fetchProducts();
      setEditingProduct(null);
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || 'Erreur lors de la modification';
      setError(msg);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await productService.delete(id);
      await fetchProducts();
      setError(null);
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null);
  };

  const handleCreateCategory = async (data) => {
    try {
      await categoryService.create(data);
      await fetchCategories();
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || 'Erreur lors de la création';
      setError(msg);
    }
  };

  const handleUpdateCategory = async (id, data) => {
    try {
      await categoryService.update(id, data);
      await fetchCategories();
      setEditingCategory(null);
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || 'Erreur lors de la modification';
      setError(msg);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await categoryService.delete(id);
      await fetchCategories();
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || 'Erreur lors de la suppression';
      setError(msg);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
  };

  const switchTab = (t) => {
    setTab(t);
    setEditingProduct(null);
    setEditingCategory(null);
    setError(null);
    if (t === 'categories') fetchCategories();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gestion de Produits</h1>
        <nav className="tab-nav">
          <button
            className={`tab-btn ${tab === 'products' ? 'active' : ''}`}
            onClick={() => switchTab('products')}
          >
            Produits
          </button>
          <button
            className={`tab-btn ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => switchTab('categories')}
          >
            Catégories
          </button>
        </nav>
      </header>

      <main className="container">
        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'products' && (
          <>
            <ProductForm
              onSubmit={editingProduct ? (data) => handleUpdateProduct(editingProduct.id, data) : handleCreateProduct}
              initialData={editingProduct}
              onCancel={editingProduct ? handleCancelEditProduct : undefined}
            />

            <ProductList
              products={products}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onFilter={handleFilter}
            />
          </>
        )}

        {tab === 'categories' && (
          <>
            <CategoryForm
              onSubmit={editingCategory ? (data) => handleUpdateCategory(editingCategory.id, data) : handleCreateCategory}
              initialData={editingCategory}
              onCancel={editingCategory ? handleCancelEditCategory : undefined}
            />

            <CategoryList
              categories={categories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
