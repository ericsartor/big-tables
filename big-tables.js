const BigTable = (function() {
  const findMutualProperties = (arrOfObjs) => {
    // build an initial list of properties to whittle down
    let mutualProperties = [];
    for (const prop in arrOfObjs.shift()) {
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
  };

  const findAllProperties = (arrOfObjs) => {
    const allPropties = [];
    arrOfObjs.forEach((obj) => {
      for (const prop in obj) {
        if (!allPropties.includes(prop)) {
          allPropties.push(prop);
        }
      }
    });

    return allPropties;
  };

  class BigTable {
    constructor(options) {
      this.objects = options.itemList;
      this.rowClass = options.rowClass || null;
      this.cellClass = options.cellClass || null;

      this.propertyMode = options.propertyMode || 'mutual';

      // create the property list depending on the property mode
      if (!Array.isArray(this.propertyMode)) {
        switch (this.propertyMode) {
          case 'all':
            this.properties = findAllProperties(this.objects);
            break;
          case 'mutual':
            this.properties = findMutualProperties(this.objects);
            break;
        }
      } else {
        this.properties = this.propertyMode;
      }

      // set column width value
      if (options.columnWidths) {
        this.columnWidths = options.columnWidths.map((widthValue) => {
          return widthValue + 'fr';
        }); 
      } else {
        // column widths default to 1fr
        this.columnWidths = '1fr,'.repeat(this,properties.length).split(',');
        this.columnWidths.pop(); // last element in array will be emptyi
      }

      this.node = createContainer();
    }

    hideColumn(columnNameOrIndex) {
      const isStringInstance = columnNameOrIndex instanceof String;
      const isStringType = typeof columnNameOrIndex === 'string';
      const isString = isStringInstance || isStringType;

      const columnName = isString ? columnNameOrIndex
        : this.properties[Number(columnNameOrIndex)];

      const columnValueCells = this.node.querySelectorAll(`${columnName}-value-cell`);

      columnValueCells.forEach((valueCell) => {
        valueCell.style.display = 'none';
      });
    }
  };
  

  return function(itemList, options) {
    // validate the itemList

    if (!Array.isArray(itemList)) {
      throw Error(`itemList must be an Array, but a ${typeof itemList}' +
        was provided.`);
    }
    
    // check to see if any items in the array are not objects
    const nonObjectitem = itemList.find((item) => {
      return !(item !== null && typeof item === 'object');
    });
    
    if (nonObjectitem) {
      throw Error(`itemList must be an Array of Objects, but a ` +
      `${typeof nonObjectitem} was found.`);
    }

    // if propertyMode is an array, make sure it only contains strings
    if (Array.isArray(options.propertyMode)) {
      options.propertyMode.forEach((propertyName) => {
        if (typeof propertyName !== 'string' && !(propertyName instanceof String)) {
          throw new Error(`Explicit property names were passed in as the ` +
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
          throw new Error(`Column widths can only be numbers or fr values, ` +
            `but the value ${valueMatch} was found in the array.`);
        }
      });
    }

    // validate orientation
    if (options.orientation) {
      if (!['column', 'row'].includes(options.orientation)) {
        throw new Error(`An explicit orientation value was supplied, but ` +
          `it was not a valid value: ${options.orientation}`);
      }
    }

    // validate classes as strings
    if (options.rowClass) {
      if (typeof options.rowClass !== 'string' && !(options.rowClass instanceof String)) {
        throw new Error(`The row class provided was not a string value: ${option.rowClass}`);
      }
    }
    
    if (options.cellClass) {
      if (typeof options.cellClass !== 'string' && !(options.cellClass instanceof String)) {
        throw new Error(`The cell class provided was not a string value: ${option.cellClass}`);
      }
    }

    /*
      options

      orientation: column/row
      cellClass: *string class name*
      rowClass: *string class name*
      propertyMode: all/mutual/[array of property names]
      columnWidths: [array of objects with headers as property names and fr
        values, each object accounts for a different combination of headers]
      
    */

    
  }
})();