const BigTable = (function() {
  /*
   *  UTILITY FUNCTIONS
   */

  const throwError = (errorText) => {
    throw new Error(`Big Tables: ${errorText}`);
  };
  
  const isString = (value) => {
    typeof value === 'string' || value instanceof String;
  };

  const isObject = (value) => {
    return value !== null && typeof value === 'object' &&
      !(value instanceof String) && !(value instanceof Number)
  }

  // loop through an array of objects and find the properties common between them
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
    const allProperties = [];
    arrOfObjs.forEach((obj) => {
      for (const prop in obj) {
        if (!allProperties.includes(prop)) {
          allProperties.push(prop);
        }
      }
    });

    return allProperties;
  };

  /*
   *  BigTable Class
   */

  class BigTable {
    constructor(itemList, options) {
      /* set properties bsaed on user input */

      this.objects = itemList;
      this.containerClass = options.containerClass || null;
      this.columnClass = options.columnClass || null;
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
        this.gridTemplate = options.columnWidths.map((widthValue) => {
          return widthValue + 'fr';
        });
      } else {
        // column widths default to 1fr
        this.gridTemplate = '1fr,'.repeat(this.properties.length).split(',');
        this.gridTemplate.pop(); // last element in array will be empty
      }

      /* initialize some internal properties */

      this.node = this.createContainer();
      this.offset = 0;
      this.rowCount = 20;
    }

    createContainer() {
      const container = document.createElement('div');
      container.className = `big-table-container ${this.containerClass || ''}`;
      container.style.display = 'grid';
      container.style.gridTemplate = `1fr / ${this.gridTemplate.join(' ')}`;

      return container;
    }

    createColumn() {
      const columnDiv = document.createElement('div');
      columnDiv.className = `big-table-column ${this.columnClass || ''}`;
      
      const gridTemplateArr = '1fr,'.repeat(this.rowCount).split(',');
      gridTemplateArr.pop(); // last element in array will be empty
      columnDiv.style.gridTemplate = `${gridTemplateArr.join(' ')} / 1fr`;

      return columnDiv;
    }

    createHeader(headerName) {
      const headerDiv = document.createElement('div');
      headerDiv.className = 'big-table-header';
      headerDiv.textContent = headerName;
      headerDiv.style.display = 'grid';

      return headerDiv;
    }

    createValueCell(value, rowNumber, columnName) {
      const valueCellDiv = document.createElement('div');
      valueCellDiv.className = `big-table-value-cell big-table-row-${rowNumber}` +
        ` big-table-${columnName}-value-cell ${this.cellClass || ''}`;
      valueCellDiv.textContent = value;

      return valueCellDiv;
    }

    draw() {
      // create document fragments for the value cells for each column div
      // simultaneously create the header divs for each column
      const columnFragments = {};
      for (const headerTitle of this.properties) {
        columnFragments[headerTitle] = document.createDocumentFragment();

        const headerDiv = this.createHeader(headerTitle);
        columnFragments[headerTitle].appendChild(headerDiv);

        // create all the value cells for this column
        for (let i = this.offset; i < this.rowCount + this.offset; i++) {
          const currentObj = this.objects[i];
          const cellValue = currentObj[headerTitle];
          
          const valueCellDiv = this.createValueCell(cellValue, i, headerTitle);
          columnFragments[headerTitle].appendChild(valueCellDiv);
        }
      }

      // create the columns
      const columnDivs = document.createDocumentFragment();
      for (const headerTitle in columnFragments) {
        const columnDiv = this.createColumn();
        columnDiv.appendChild(columnFragments[headerTitle]);
        columnDivs.appendChild(columnDiv);
      }
      
      // erase the whole table
      while (this.node.children.length) {
        this.node.children[0].remove();
      }

      this.node.appendChild(columnDivs);
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
  
  /*
   *  VALIDATION AND INITIALIZER
   */

  return function(itemList, options) {
    // validate the itemList

    if (!Array.isArray(itemList)) {
      throwError(`itemList must be an Array, but a ${typeof itemList}` +
        `was provided.`);
    }
    
    // check to see if any items in the array are not objects
    let foundNonObjectItem = false; // this flag is required because the non-object item may be falsey or undefined
    const nonObjectitem = itemList.find((item) => {
      if (!isObject(item)) {
        foundNonObjectItem = true;
        return true;
      }
    });
    
    if (foundNonObjectItem) {
      throwError(`itemList must be an Array of Objects, but a ` +
      `${typeof nonObjectitem} value was found.`);
    }

    // if propertyMode is an array, make sure it only contains strings
    if (Array.isArray(options.propertyMode)) {
      options.propertyMode.forEach((propertyName) => {
        if (!isString(propertyName)) {
          throwError(`Explicit property names were passed in as the ` +
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
          throwError(`Column widths can only be numbers or fr values, ` +
            `but the value ${valueMatch} was found in the array.`);
        }
      });
    }

    // validate orientation
    if (options.orientation) {
      if (!['column', 'row'].includes(options.orientation)) {
        throwError(`An explicit orientation value was supplied, but ` +
          `it was not a valid value: ${options.orientation}`);
      }
    }

    // validate classes as strings
    if (options.containerClass) {
      if (!isString(options.containerClass)) {
        throwError(`The container class provided was not a string value: ${option.containerClass}`);
      }
    }

    if (options.columnClass) {
      if (!isString(options.columnClass)) {
        throwError(`The row class provided was not a string value: ${option.columnClass}`);
      }
    }
    
    if (options.cellClass) {
      if (!isString(options.cellClass)) {
        throwError(`The cell class provided was not a string value: ${option.cellClass}`);
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
})();