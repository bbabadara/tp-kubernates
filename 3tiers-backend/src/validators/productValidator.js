class ProductValidator {
  validateCreate(data) {
    const errors = [];

    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) {
      errors.push('Le nom est requis et doit être une chaîne non vide');
    }

    if (data.prix === undefined || data.prix === null) {
      errors.push('Le prix est requis');
    } else if (isNaN(parseFloat(data.prix)) || parseFloat(data.prix) < 0) {
      errors.push('Le prix doit être un nombre positif');
    }

    if (data.stock !== undefined && data.stock !== null) {
      if (!Number.isInteger(Number(data.stock)) || parseInt(data.stock) < 0) {
        errors.push('Le stock doit être un entier positif');
      }
    }

    if (data.categorieId !== undefined && data.categorieId !== null && data.categorieId !== '') {
      const id = parseInt(data.categorieId);
      if (isNaN(id) || id < 1) {
        errors.push('La catégorie sélectionnée est invalide');
      }
    }

    return errors;
  }

  validateUpdate(data) {
    const errors = [];

    if (data.nom !== undefined && (typeof data.nom !== 'string' || data.nom.trim().length === 0)) {
      errors.push('Le nom doit être une chaîne non vide');
    }

    if (data.prix !== undefined) {
      if (isNaN(parseFloat(data.prix)) || parseFloat(data.prix) < 0) {
        errors.push('Le prix doit être un nombre positif');
      }
    }

    if (data.stock !== undefined) {
      if (!Number.isInteger(Number(data.stock)) || parseInt(data.stock) < 0) {
        errors.push('Le stock doit être un entier positif');
      }
    }

    if (data.categorieId !== undefined && data.categorieId !== null && data.categorieId !== '') {
      const id = parseInt(data.categorieId);
      if (isNaN(id) || id < 1) {
        errors.push('La catégorie sélectionnée est invalide');
      }
    }

    return errors;
  }
}

module.exports = new ProductValidator();
