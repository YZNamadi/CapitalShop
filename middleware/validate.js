const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

exports.validate = validations => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      [err.path]: err.msg
    }));

    return next(new AppError('Validation failed', 400, extractedErrors));
  };
};

// Common validation schemas
exports.schemas = {
  id: {
    in: ['params'],
    isMongoId: true,
    errorMessage: 'Invalid ID format'
  },
  pagination: {
    page: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1 }
      },
      toInt: true
    },
    limit: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1, max: 100 }
      },
      toInt: true
    }
  },
  user: {
    email: {
      in: ['body'],
      isEmail: true,
      normalizeEmail: true,
      errorMessage: 'Must be a valid email address'
    },
    password: {
      in: ['body'],
      isLength: {
        options: { min: 8 }
      },
      matches: {
        options: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/,
        errorMessage: 'Password must contain at least one number, one uppercase and one lowercase letter'
      }
    }
  }
}; 