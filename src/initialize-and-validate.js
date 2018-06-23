return function(itemList, options) {
  // validate the itemList

  if (!Array.isArray(itemList)) {
    throw Utils.generateError(`itemList must be an Array, but a ${typeof itemList}` +
      `was provided.`);
  }
  
  // check to see if any items in the array are not objects
  let foundNonObjectItem = false; // this flag is required because the non-object item may be falsey or undefined
  const nonObjectitem = itemList.find((item) => {
    if (!Utils.isObject(item)) {
      foundNonObjectItem = true;
      return true;
    }
  });
  
  if (foundNonObjectItem) {
    throw Utils.generateError(`itemList must be an Array of Objects, but a ` +
    `${typeof nonObjectitem} value was found.`);
  }

  // if propertyMode is an array, make sure it only contains strings
  if (Array.isArray(options.propertyMode)) {
    options.propertyMode.forEach((propertyName) => {
      if (!Utils.isString(propertyName)) {
        throw Utils.generateError(`Explicit property names were passed in as the ` +
          `property mode, but some of the values are not strings.`);
      }
    });
  }

  // make sure column widths are either numbers or fr values
  if (options.columnWidths) {
    options.columnWidths.forEach((widthValue) => {
      const valueMatch = widthValue.match(/^[0-9]+|[0-9]+fr$/);
      if (valueMatch) {
        valueMatch = valueMatch.includes('fr') ? valueMatch : valueMatch + 'fr';
      } else {
        throw Utils.generateError(`Column widths can only be numbers or fr values, ` +
          `but the value ${valueMatch} was found in the array.`);
      }
    });
  }

  // validate orientation
  if (options.orientation) {
    if (!['column', 'row'].includes(options.orientation)) {
      throw Utils.generateError(`An explicit orientation value was supplied, but ` +
        `it was not a valid value: ${options.orientation}`);
    }
  }

  // validate classes as strings
  if (options.containerClass) {
    if (!Utils.isString(options.containerClass)) {
      throw Utils.generateError(`The container class provided was not a string value: ${options.containerClass}`);
    }
  }

  if (options.columnClass) {
    if (!Utils.isString(options.columnClass)) {
      throw Utils.generateError(`The row class provided was not a string value: ${options.columnClass}`);
    }
  }

  if (options.headerClass) {
    if (!Utils.isString(options.headerClass)) {
      throw Utils.generateError(`The header class provided was not a string value: ${options.headerClass}`);
    }
  }
  
  if (options.cellClass) {
    if (!Utils.isString(options.cellClass)) {
      throw Utils.generateError(`The cell class provided was not a string value: ${options.cellClass}`);
    }
  }

  return new BigTable(itemList, options);

  /*
    required

      itemList: array of objects

    options

      orientation: column/row
      containerClass: *string class name*
      cellClass: *string class name*
      rowClass: *string class name*
      propertyMode: all/mutual/[array of property names]
      columnWidths: [array of objects with headers as property names and fr
        values, each object accounts for a different combination of headers]
    
  */

  
}