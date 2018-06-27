const Utils = {
  generateError(errorText) {
    return new Error(`Big Tables: ${errorText}`);
  },
  
  isString(value) {
    return typeof value === 'string' || value instanceof String;
  },

  isObject(value) {
    return value !== null && typeof value === 'object' &&
      !(value instanceof String) && !(value instanceof Number)
  },

  addIfNotPresent(value, array) {
    if (!array.includes(value)) {
      array.push(value);
      return true;
    } else {
      return false;
    }
  },

  validateCssUnitValue(value) {
    //  valid CSS unit types
    const CssUnitTypes = ['em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin',
    'vmax', '%', 'cm', 'mm', 'in', 'px', 'pt', 'pc'];
    
    // create a set of regexps that will validate the CSS unit value
    const regexps = CssUnitTypes.map((unit) => {
      // creates a regexp that matches "#unit" or "#.#unit" for every unit type
      return new RegExp(`^[0-9]+${unit}$|^[0-9]+\\.[0-9]+${unit}$`, 'i');
    });

    // attempt to find a regexp that tests true for the CSS value
    const isValid = regexps.find((regexp) => regexp.test(value)) !== undefined;

    return isValid;
  },

  // loop through an array of objects and find the properties common between them
  findMutualProperties(arrOfObjs) {
    // build an initial list of properties to whittle down
    let mutualProperties = [];
    for (const prop in arrOfObjs[0]) {
      mutualProperties.push(prop);
    }

    // loop through rest of objs and attempt to remove any non-mutual props
    arrOfObjs.forEach((obj) => {
      const propsFromThisObj = [];
      for (const prop in obj) {
        propsFromThisObj.push(prop);
      }

      // remove properties that this object didn't have
      mutualProperties = mutualProperties.filter((prop) => {
        return propsFromThisObj.includes(prop);
      });
    });

    return mutualProperties;
  },

  findAllProperties(arrOfObjs) {
    const allProperties = [];
    arrOfObjs.forEach((obj) => {
      for (const prop in obj) {
        if (!allProperties.includes(prop)) {
          allProperties.push(prop);
        }
      }
    });

    return allProperties;
  }
};