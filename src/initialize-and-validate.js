return function(itemList, options) {
  /*
    required

      itemList: array of objects

    options
      
      scrollBar: Boolean (scrolling enabled either way, this just toggles a
        visible scroll bar)
      
      containerClass: *string class name* (the class applied to the table
        container)
      
      headerClass: *string class name* (the class applied to the header cells)
      
      columnClass: *string class name* (the class applied to the column containers)
      
      cellClass: *string class name* (the class applied to every value cell)
      
      scrollBarContainerClass: *string class name* (the class applied to the
        scroll bar background)
      
      scrollBarHeadClass: *string class name* (the class applied to the scroll
        bar head)
      
      propertyMode: all/mutual/explicit : default=mutual
      
      properties: [array of property names] (necessary if propertyMode is explicit)
      
      headerMap: object<string, string> mapping header titles to object properties
      
      columnWidths: object with headers as property names and fr values

      sortingOrderMap: object with property names as keys and arrays of other
        property names as values, signifying the secondary etc properties to use
        for sorting
        Ex: If sorting by prop1, for identical values, use prop2
        to sort by, and for identical prop2 values, use prop3, etc
    
  */

  // make sure there are no unexpected options
  const validOptions = [
    'theme',
    'containerClass',
    'headerClass',
    'columnClass',
    'cellClass',
    'scrollBarTrackClass',
    'scrollBarHeadClass',
    'horizontalScrollBarTrackClass',
    'horizontalScrollBarHeadClass',
    'showVerticalScrollBar',
    'showHorizontalScrollBar',
    'enableSelection',
    'enableColumnResizing',
    'enableMoveableColumns',
    'optimizeSorting',
    'propertyMode',
    'properties',
    'headerMap',
    'columnWidths',
    'sortOrderMap',
    'headerListeners',
    'cellListeners',
    'valueParseFunctions',
  ];
  for (const prop in options) {
    if (!validOptions.includes(prop)) {
      throw Utils.generateError(`Unexpected option "${prop}" provided in` +
        ` initializer.`);
    }
  }

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

  // assert that theme provided is a valid theme
  if (options.theme !== undefined) {
    if (!Utils.isString(options.theme)) {
      throw Utils.generateError(`Theme name must be a string, you provided` +
        ` a "${typeof options.theme}"`);
    }

    if (!Object.keys(Themes).includes(options.theme) || options.theme === '') {
      throw Utils.generateError(`Supplied theme name is not one of the built` +
        ` in themes: "${options.theme}"`);
    }
  }

  // validate CSS classes as strings
  const validatePropertyAsString = (propertyName) => { 
    if (options[propertyName]) {
      if (!Utils.isString(options[propertyName])) {
        throw Utils.generateError(`The ${propertyName} value provided was not a string ` +
          `value: ${options[propertyName]} (${typeof options[propertyName]})`);
      }
    }
  };
  validatePropertyAsString('containerClass');
  validatePropertyAsString('headerClass');
  validatePropertyAsString('columnClass');
  validatePropertyAsString('cellClass');
  validatePropertyAsString('scrollBarContainerClass');
  validatePropertyAsString('scrollBarTrackClass');
  validatePropertyAsString('scrollBarHeadClass');
  validatePropertyAsString('horizontalScrollBarTrackClass');
  validatePropertyAsString('horizontalScrollBarHeadClass');
  

  // create the property list depending on the property mode
  const propertyMode = options.propertyMode || 'mutual';

  switch (propertyMode) {
    case 'all':
      options.properties = Utils.findAllProperties(itemList);
      break;
    case 'mutual':
      options.properties = Utils.findMutualProperties(itemList);
      break;
    case 'explicit':
      // if propertyMode is explicit, make sure it is an array and only contains
      // strings

      // assert that properties array was provided
      if (options.properties === undefined) {
        throw Utils.generateError(`propertyMode was set to explicit but no` +
          ` properties array was provided.`);
      }

      // assert that properties value is an Array
      if (!Array.isArray(options.properties)) {
        throw Utils.generateError(`propertyMode was set to explicit, but ` +
          `properties value was not an Array of strings, you supplied a: ` + 
          `${typeof options.properties}`);
      }

      // assert that property array is not empty
      if (options.properties.length < 1) {
        throw Utils.generateError(`propertyMode was set to explicit, but` +
          ` properties array is empty.`);
      }

      // assert that all the property array values are strings
      options.properties.forEach((propertyName) => {
        if (!Utils.isString(propertyName)) {
          throw Utils.generateError(`Not all property names that were included` +
            ` in the property array are strings.`);
        }
      });
      break;
  }

  // validate headerMap
  if (options.headerMap) {
    for (const propertyName in options.headerMap) {
      // assert propertyName exists as an item property for this table
      if (!options.properties.includes(propertyName)) {
        throw Utils.generateError(`A headerMap was provided, but it contains` +
          ` an invalid property name as a key based on your property mode:` +
          ` ${propertyName}`);
      }


      // assert that the value for this property map is a string
      const value = options.headerMap[propertyName];
      if (!Utils.isString(value)) {
        throw Utils.generateError(`A headerMap was provided for the ` +
          ` "${propertyName}" property, but the value is not a string: ` +
          ` ${value} (${typeof value})`);
      }
    }
  }

  // validate that the column width map contains valid property names
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
      if (!options.properties.includes(key)) {
        throw Utils.generateError(`An invalid columnWidths key was provided that` +
          ` did not match any item properties: ${key}`);
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

  // validate sortOrderMap contains valid values
  if (options.sortOrderMap) {
    for (const propertyName in options.sortOrderMap) {
      // assert that the property name is in the property list
      if (!options.properties.includes(propertyName)) {
        throw Utils.generateError(`Invalid property name "${propertyName}"` +
          ` provided in sortOrderMap.`);
      }

      const sortOrderArray = options.sortOrderMap[propertyName];

      // assert that value is array
      if (!Array.isArray(sortOrderArray)) {
        throw Utils.generateError(`Value provided for property name ` +
          ` "${propertyName}" in sortOrderMap in not an array.`);
      }

      // asssert that all the values in the array are also in the property list
      sortOrderArray.forEach((sortPropertyName) => {
        if (!options.properties.includes(sortPropertyName)) {
          throw Utils.generateError(`Invalid property name "${sortPropertyName}"` +
          ` provided in sortOrderMap array for property "${propertyName}".`);
        }
      });
    }
  }

  const validateListenerObjects = (listenerType) => {
    const listenerPropertyName = listenerType + 'Listeners';

    // valid keys can be property names or the word 'all'
    const validKeys = ['all'].concat(options.properties);
    
    // assert that there are no invalid keys
    const invalidKey = Object.keys(options[listenerPropertyName]).find((key) => {
      return !validKeys.includes(key);
    });
    if (invalidKey !== undefined) {
      throw Utils.generateError(`Invalid key found in ${listenerType}Listeners: ` +
        `${invalidKey}.  Keys can only be itemList property names` +
        ` or the word "all".`);
    }

    // validate each listener object
    for (const listenerName in options[listenerPropertyName]) {
      const listenerObjectArray = options[listenerPropertyName][listenerName];

      listenerObjectArray.forEach((listenerObject) => {
        // check for unexpected properties
        const validProperties = ['eventName', 'listener'];
        const invalidProperty = Object.keys(listenerObject).find((key) => {
          return !validProperties.includes(key);
        });
        if (invalidProperty !== undefined) {
          throw Utils.generateError(`Invalid property found in ${listenerType} listener` +
            ` object for "${listenerName}": ${invalidProperty}.  Valid properties` +
            ` are: ${validProperties.join(', ')}.`);
        }

        // validate correct type for each property
        if (!Utils.isString(listenerObject['eventName'])) {
          throw Utils.generateError(`${listenerType} listener event names must` +
            ` be strings, but a "${typeof listenerObject['eventName']}" was` +
            ` provided in the listener object for "${listenerName}":` +
            ` ${listenerObject['eventName']}`);
        }
        if (typeof listenerObject['listener'] !== 'function') {
          throw Utils.generateError(`${listenerType} listeners must be functions,` +
            ` but a "${typeof listenerObject['listener']}" was provided in` +
            ` the listener object for "${listenerName}": ` +
            ` ${listenerObject['listener']}`);
        }
      });
    }
  };

  if (options.headerListeners) {
    validateListenerObjects('header');
  }

  if (options.cellListeners) {
    validateListenerObjects('cell');
  }

  if (options.valueParseFunctions) {
    // valid keys can be property names or the word 'all'
    const validKeys = ['all'].concat(options.properties);
    
    // assert that there are no invalid keys
    const invalidKey = Object.keys(options.valueParseFunctions).find((key) => {
      return !validKeys.includes(key);
    });
    if (invalidKey !== undefined) {
      throw Utils.generateError(`Invalid key found in valueParseFunctions map:` +
        ` "${invalidKey}".  Keys can only be itemList property names` +
        ` or the word "all".`);
    }

    // validate each parse function object
    for (const propertyName in options.valueParseFunctions) {
      const parseFunction = options.valueParseFunctions[propertyName];

      if (typeof parseFunction !== 'function') {
        throw Utils.generateError(`The value provided for "${propertyName}"` +
          ` in the valueParseFunctions map was a "${typeof parseFunction}".` +
          ` A function was expected.`);
      }
    }
  }

  return new BigTable(itemList, options);  
}