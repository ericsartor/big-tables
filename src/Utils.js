const Utils = {
  generateError(errorText) {
    return new Error(`Big Tables: ${errorText}`);
  },
  
  isString(value) {
    return typeof value === 'string' || value instanceof String;
  },

  isObject (value) {
    return value !== null && typeof value === 'object' &&
      !(value instanceof String) && !(value instanceof Number)
  }
};