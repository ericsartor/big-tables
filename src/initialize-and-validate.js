return function(itemList, options) {
  /*
    required

      itemList: array of objects

    options

      orientation: column/row : default=row
      scrollBar: Boolean (scrolling enabled either way, this just toggles a visible scroll bar)
      containerClass: *string class name* (the class applied to the table container)
      headerClass: *string class name* (the class applied to the header cells)
      columnClass: *string class name* (the class applied to the column containers)
      cellClass: *string class name* (the class applied to every value cell)
      scrollBarContainerClass: *string class name* (the class applied to the scroll bar background)
      scrollBarHeadClass: *string class name* (the class applied to the scroll bar head)
      propertyMode: all/mutual/explicit : default=mutual
      properties: [array of property names] (necessary if propertyMode is explicit)
      headerMap: object<string, string> mapping header titles to object properties
      columnWidths: object with headers as property names and fr values
    
  */

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
  

  // create the columnHeader list depending on the property mode
  const propertyMode = options.propertyMode || 'mutual';
  options.columnHeaders = null;

  switch (propertyMode) {
    case 'all':
      options.properties = Utils.findAllProperties(itemList);
      options.columnHeaders = options.properties;
      break;
    case 'mutual':
      options.properties = Utils.findMutualProperties(itemList);
      options.columnHeaders = options.properties;
      break;
    case 'explicit':
      // if propertyMode is explicit, make sure it is an array and only contains strings

      // assert that properties array was provided
      if (options.properties === undefined) {
        throw Utils.generateError(`propertyMode was set to explicit but no` +
          ` properties array was provided.`);
      }

      // assert that properties value is an Array
      if (!Array.isArray(options.properties)) {
        throw Utils.generateError(`propertyMode was set to explicit, but properties` +
          ` value was not an Array of strings, you supplied a: ` + typeof options.properties);
      }

      // assert that property array is not empty
      if (options.properties.length < 1) {
        throw Utils.generateError(`propertyMode was set to explicit, but properties` +
          ` array is empty.`);
      }

      // assert that all the property array values are strings
      options.properties.forEach((propertyName) => {
        if (!Utils.isString(propertyName)) {
          throw Utils.generateError(`Not all property names that were included in` +
            ` the property array are strings.`);
        }
      });

      options.columnHeaders = options.properties;
      break;
  }

  // if headerMap is provided, attempt to map it's values onto the columnHeaders
  // array, and flag any missing or invalid property maps
  if (options.headerMap) {
    options.columnHeaders = options.columnHeaders.map((propertyName) => {
      const value = options.headerMap[propertyName];

      // assert that the mapped value for this property exists
      if (value === undefined) {
        throw Utils.generateError(`headerMap was provided but it does not contain` +
          ` a mapping for the ${propertyName} property`);
      }

      // assert that the mapped value for this property is a string
      if (!Utils.isString(value)) {
        throw Utils.generateError(`One of the values in the headerMap provided` +
          ` was not a string: ${value} (${typeof value})`);
      }
      
      return value;
    });
  }

  // validate that the column width map contains valid column or property names
  // and valid unit values
  if (options.columnWidths) {
    // assert that the value is an object
    if (!Utils.isObject(options.columnWidths)) {
      throw Utils.generateError(`columnWidths value provided is not an Object. A` +
        ` ${typeof options.columnWidths} was provided: ${options.columnWidths}`);
    }

    // assert that all object keys are either valid itemList properties or
    // valid column headers and that all values are strings and valid CSS values
    for (const key in options.columnWidths) {
      // assert that the key is valid
      if (!options.columnHeaders.includes(key) && !options.properties.includes(key)) {
        throw Utils.generateError(`An invalid columnWidths key was provided that` +
          ` did not match any column headers or item property keys: ${key}`);
      }

      const value = options.columnWidths[key];

      // assert that the value is a string
      if (!Utils.isString(value)) {
        throw Utils.generateError(`One of the columnWidths values provided was` +
          ` not a string: ${value} (${typeof value})`);
      }

      // assert that value is a valid CSS unit value
      if (!Utils.validateCssUnitValue(value)) {
        throw Utils.generateError(`One of the columnWidths values provided was` +
          ` not a valid CSS unit value: ${value}`);
      }
    }
  }

  // validate orientation
  if (options.orientation) {
    if (!['column', 'row'].includes(options.orientation)) {
      throw Utils.generateError(`An explicit orientation value was supplied, but ` +
        `it was not a valid value: ${options.orientation}`);
    }
  }

  const validatePropertyAsString = (propertyName) => { 
    if (options[propertyName]) {
      if (!Utils.isString(options[propertyName])) {
        throw Utils.generateError(`The ${propertyName} value provided was not a string ` +
          `value: ${options[propertyName]} (${typeof options[propertyName]})`);
      }
    }
  };

  // validate classes as strings
  validatePropertyAsString('containerClass');
  validatePropertyAsString('headerClass');
  validatePropertyAsString('columnClass');
  validatePropertyAsString('cellClass');
  validatePropertyAsString('scrollBarContainerClass');
  validatePropertyAsString('scrollBarHeadClass');

  return new BigTable(itemList, options);  
}