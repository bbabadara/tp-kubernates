class CategoryValidator {
  validateCreate(data) {
    const errors = [];

    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) {
      errors.push('Le nom est requis et doit être une chaîne non vide');
    }

    return errors;
  }

  validateUpdate(data) {
    const errors = [];

    if (data.nom !== undefined && (typeof data.nom !== 'string' || data.nom.trim().length === 0)) {
      errors.push('Le nom doit être une chaîne non vide');
    }

    return errors;
  }
}

module.exports = new CategoryValidator();
