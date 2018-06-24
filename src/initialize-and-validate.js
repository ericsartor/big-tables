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
      options.columnHeaders = Utils.findAllProperties(itemList);
      options.properties = options.columnHeaders;
      break;
    case 'mutual':
      options.columnHeaders = Utils.findMutualProperties(itemList);
      options.properties = options.columnHeaders;
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
          throw Utils.generateError(`Not all property names that were passed in ` +
            `property array are strings.`);
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

  // make sure column widths are either numbers or fr values
  if (options.columnWidths) {
    // assert that the value is an array
    if (!Array.isArray(options.columnWidths)) {
      throw Utils.generateError(`columnWidths value provided is not an Array. A` +
        ` ${typeof options.columnWidths} was provided: ${options.columnWidths}`);
    }

    // assert that there are an equal number of columnWidths as properties
    if (options.columnWidths.length !== options.columnHeaders.length) {
      const more = options.columnWidths.length > options.columnHeaders.length;
      throw Utils.generateError(`${more ? 'More' : 'Less'} columnWidths values` +
        ` were provided than there are columns.  ${options.columnHeaders.length}` +
        ` properties were provided/detected, but ${options.columnWidths.length}` +
        ` columnWidths were provided.`);
    }

    // assert that values are all strings or numbers
    const invalidValueFound = options.columnWidths.findIndex((widthValue) => {
      return !Utils.isString(widthValue) && typeof widthValue !== 'number';
    }) > -1;
    if (invalidValueFound) {
      throw Utils.generateError(`columnWidths array contains a value that is neither` +
        ` a string or a number`);
    }

    // assert that all string values match the '#fr' '#.#fr' template
    options.columnWidths.forEach((widthValue) => {
      if (Utils.isString(widthValue)) {
        if (widthValue.match(/[0-9]+fr|[0-9]+\.[0-9]+fr/i) === null) {
          throw Utils.generateError(`One of the columnWidths values is an invalid` +
            `string format: ${widthValue}.  All string values should match the` +
            `'#fr' or '#.#fr' template.`);
        }
      }
    });

    // format all values to '#fr'
    options.columnWidths = options.columnWidths.map((widthValue) => {
      if (!Utils.isString(widthValue)) {
        return `${widthValue}fr`;
      } else {
        return widthValue;
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

  if (options.headerClass) {
    if (!Utils.isString(options.headerClass)) {
      throw Utils.generateError(`The header class provided was not a string value: ${options.headerClass}`);
    }
  }

  if (options.columnClass) {
    if (!Utils.isString(options.columnClass)) {
      throw Utils.generateError(`The row class provided was not a string value: ${options.columnClass}`);
    }
  }
  
  if (options.cellClass) {
    if (!Utils.isString(options.cellClass)) {
      throw Utils.generateError(`The cell class provided was not a string value: ${options.cellClass}`);
    }
  }

  return new BigTable(itemList, options);  
}