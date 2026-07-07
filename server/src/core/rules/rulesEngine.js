// core/rules/rulesEngine.js
const AppError = require('../error/AppError');

class RulesEngine {
  /**
   * Validates dynamic transaction values against schema definitions and rules
   */
  validate(values, fieldsDefinition) {
    const errors = [];

    fieldsDefinition.forEach(field => {
      const value = values[field.permanentKey];

      // 1. Required Validation Rule
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field.label}' is required.`);
      }

      // 2. Regular Expression Pattern Validation
      if (value && field.validationPattern) {
        try {
          const regex = new RegExp(field.validationPattern);
          if (!regex.test(String(value))) {
            errors.push(field.validationMessage || `Field '${field.label}' has an invalid format.`);
          }
        } catch (err) {
          // If regex pattern is syntactically invalid, log it
          console.error(`Invalid regex rule for field '${field.permanentKey}': ${err.message}`);
        }
      }

      // 3. Numeric boundaries checks
      if (value !== undefined && value !== null && field.fieldType === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`Field '${field.label}' must be a valid number.`);
        }
      }
    });

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join(' ')}`, 400);
    }

    return true;
  }
}

module.exports = new RulesEngine();
