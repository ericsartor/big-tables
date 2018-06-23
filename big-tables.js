const BigTable = (function() {const style = document.createElement('style');
  style.innerHTML = `
  .big-table-scroll-bar-container {
    position:relative;
    grid-column:-2;
    grid-row:1;
    background:blue;
  }
  .big-table-scroll-bar-head {
    position:relative;
    background-color:black;
    width:80%;
    margin-left:10%;
  }

  .big-table-header {
    user-select:none;
  }

  .big-table-value-cell {
    user-select:none;
  }
  .big-table-value-cell.enable-select {
    user-select:initial;
  }
  `;

  document.head.appendChild(style);
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
function BigTable(itemList, options) {
  /* PRIVATE METHODS */

  const createContainer = () => {
    const container = document.createElement('div');
    container.className = `big-table-container ${this._props.containerClass || ''}`;
    container.style.display = 'grid';
    container.style.gridTemplate = `1fr / ${this._props.gridTemplate.join(' ')}${this._props.options.scrollBar ? ` 30px` : ''}`;

    container.addEventListener('wheel', (e) => {
      // determine determine how many steps to count the scroll as
      let scrollCount = 0;
      if (e.deltaY > 0) {
        let stepCounter = 0;
        while (e.deltaY > stepCounter) {
          stepCounter += 50;
          scrollCount++;
        }
      } else {
        
        let stepCounter = 0;
        while (e.deltaY < stepCounter) {
          stepCounter -= 50;
          scrollCount--;
        }
      }

      performScroll(scrollCount);
    });

    return container;
  }

  const createColumn = () => {
    const columnDiv = document.createElement('div');
    columnDiv.className = `big-table-column ${this._props.columnClass || ''}`;
    
    const gridTemplateArr = '1fr,'.repeat(this._props.rowCount).split(',');
    gridTemplateArr.pop(); // last element in array will be empty
    columnDiv.style.gridTemplate = `${gridTemplateArr.join(' ')} / 1fr`;

    return columnDiv;
  }

  const createHeader = (headerName) => {
    const headerDiv = document.createElement('div');
    headerDiv.className = `big-table-header ${this._props.headerClass || ''}`;
    headerDiv.textContent = headerName;
    headerDiv.style.display = 'grid';

    return headerDiv;
  }

  const createValueCell = (value, rowNumber, columnName) => {
    const valueCellDiv = document.createElement('div');
    valueCellDiv.className = `big-table-value-cell big-table-row-${rowNumber}` +
      ` big-table-${columnName}-value-cell ${this._props.cellClass || ''}`;
    valueCellDiv.textContent = value;

    const tableContainer = this.node;

    valueCellDiv.addEventListener('mouseover', function(e) {
      const allValueCells = Array.from(tableContainer.getElementsByClassName(`big-table-value-cell`));
      allValueCells.forEach((cell) => cell.classList.remove('enable-select'));

      if (e.ctrlKey) {
        // make all cells in this row selectable
        const rowValueCells = Array.from(tableContainer.getElementsByClassName(`big-table-row-${rowNumber}`));
        rowValueCells.forEach((cell) => cell.classList.add('enable-select'));
      } else {
        // make all cells in this column selectable
        const columnValueCells = Array.from(tableContainer.getElementsByClassName(`big-table-${columnName}-value-cell`));
        columnValueCells.forEach((cell) => cell.classList.add('enable-select'));
      }

    });

    return valueCellDiv;
  }

  const draw = () => {
    // create document fragments for the value cells for each column div
    // simultaneously create the header divs for each column
    const columnFragments = {};
    for (const headerTitle of this.columnHeaders) {


      columnFragments[headerTitle] = document.createDocumentFragment();

      const headerDiv = createHeader(headerTitle);
      columnFragments[headerTitle].appendChild(headerDiv);

      // create all the value cells for this column
      const propertyName = this._props.propertyMap ? this._props.propertyMap[headerTitle] : headerTitle;
      for (let i = this.offset; i < this._props.rowCount + this.offset; i++) {
        const currentObj = this.objects[i];
        const cellValue = currentObj[propertyName] !== undefined ? currentObj[propertyName] : '[no value]';
        
        const valueCellDiv = createValueCell(cellValue, i, propertyName);
        columnFragments[headerTitle].appendChild(valueCellDiv);
      }
    }

    // create the columns
    const columnDivs = document.createDocumentFragment();
    for (const headerTitle in columnFragments) {
      const columnDiv = createColumn();
      columnDiv.appendChild(columnFragments[headerTitle]);
      columnDivs.appendChild(columnDiv);
    }
    
    // erase the whole table
    if (this._props.options.scrollBar) {
      for (let i = this.node.children.length - 1; i >= 0; i--) {
        if (!this.node.children[i].classList.contains('big-table-scroll-bar-container')) {
          this.node.children[i].remove();
        }
      }
    } else {
      while (this.node.children.length !== 0) {
        this.node.children[0].remove();
      }
    }
      

    this.node.appendChild(columnDivs);
  }

  const hideColumn = (columnNameOrIndex) => {
    const columnName = Utils.isString(columnNameOrIndex) ? columnNameOrIndex
      : this.columnHeaders[Number(columnNameOrIndex)];

    const columnValueCells = this.node.querySelectorAll(`${columnName}-value-cell`);

    columnValueCells.forEach((valueCell) => {
      valueCell.style.display = 'none';
    });
  }

  /* SCROLLING STUFF */

  // returns the maximum the table offset can be without showing blank space
  const determineMaxOffset = () => {
    return this.objects.length - this._props.rowCount;
  }

  const determineMaxScrollBarTop = () => {
    return 100 - parseFloat(this._props.scrollBarHead.style.height);;
  }

  const determineScrollBarScalingAmount = () => {
    let amount = 100;

    if (this.objects.length <= this._props.rowCount) return amount;

    const excessRows = this.objects.length - this._props.rowCount;

    let subtractAmount = 1;
    for (let i = 0; i < excessRows; i++) {
      amount -= subtractAmount;

      if (amount <= 20) return amount;

      subtractAmount *= 0.99;
    }

    return amount;
  }

  const createScrollBar = () => {
    const scrollBarContainer = document.createElement('div');
    scrollBarContainer.className = 'big-table-scroll-bar-container';
    this._props.scrollBarContainer = scrollBarContainer;

    const scrollBarHead = document.createElement('div');
    scrollBarHead.className = 'big-table-scroll-bar-head';
    scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
    this._props.scrollBarHead = scrollBarHead;

    const that = this;
    scrollBarHead.addEventListener('mousedown', (e) => {
      that._props.grabbingScrollBar = true;
      that._props.scrollBarGrabPreviousY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      that._props.grabbingScrollBar = false;
      that._props.scrollBarGrabPreviousY = null;
    });

    window.addEventListener('mousemove', (e) => {
      if (!that._props.grabbingScrollBar) return;

      const containerRect = this._props.scrollBarContainer.getBoundingClientRect();

      if (e.clientY < containerRect.top) {
        performScroll(-this.offset);
      } else if (e.clientY > containerRect.bottom) {
        performScroll(determineMaxOffset() - this.offset);
      } else {
        const totalPixelsOfMovement = determineMaxScrollBarTop() / 100 * containerRect.height;
        const rowsPerPixel = this.objects.length / totalPixelsOfMovement;
        const moveAmountPixels = e.clientY - that._props.scrollBarGrabPreviousY;
        const totalRowsMoved = rowsPerPixel * moveAmountPixels;
  
        
        performScroll(Math.round(totalRowsMoved));
      }

      that._props.scrollBarGrabPreviousY = e.clientY;
      updateScrollHead();
    })

    scrollBarContainer.appendChild(scrollBarHead);
    this.node.appendChild(scrollBarContainer);
  }

  const updateScrollHead = () => {
    const maximumTop = determineMaxScrollBarTop();
    const maxOffset = determineMaxOffset();
    const newTop = (this.offset / maxOffset) * maximumTop;
    this._props.scrollBarHead.style.top = newTop + '%';
  }

  // updates the table offset then re-draws table
  const performScroll = (steps) => {
    const desiredOffset = this.offset + steps;
    const notTooHigh = desiredOffset <= determineMaxOffset();
    
    if (notTooHigh && desiredOffset >= 0) {
      this.offset = desiredOffset;
    } else {
      return;
    }

    if (this._props.scrollBar) updateScrollHead();
    
    draw();
  }

  /**********************************
  ** PUBLIC METHODS AND PROPERTIES **
  ***********************************/

  this.place = (options) => {
    if (!options) {
      throw Utils.generateError(`Tried to append table to page but no options` +
      ` object was supplied.`);
    }

    if (options.appendChild) {
      let parentNode;

      if (Utils.isString(options.appendChild)) {
        parentNode = document.getElementById(options.appendChild);

        if (parentNode === null) {
          throw Utils.generateError(`Tried to append table to page using` +
            ` appendChild option, but string argument was not an existing ID: ` +
            options.appendChild);
        }
      } else if (options.appendChild instanceof HTMLElement) {
        parentNode = options.appendChild;
      } else {
        throw Utils.generateError(`Tried to append table to page using appendChild` +
          ` option, but argument was neither a string ID or an HTMLElement: ` +
          options.appendChild);
      }
      
      parentNode.appendChild(this.node);
    } else if (options.insertBefore) {
      let insertBeforeNode;

      if (Utils.isString(options.insertBefore)) {
        insertBeforeNode = document.getElementById(options.insertBefore);

        if (insertBeforeNode === null) {
          throw Utils.generateError(`Tried to append table to page using insertBefore` +
            ` option, but string argument was not an existing ID: ` +
            options.insertBefore);
        }
      } else if (options.insertBefore instanceof HTMLElement) {
        insertBeforeNode = options.insertBefore;
      } else {
        throw Utils.generateError(`Tried to append table to page using insertBefore` +
          ` option, but argument was neither a string ID or an HTMLElement: ` +
          options.insertBefore);
      }
      
      insertBeforeNode.parentNode.insertBefore(this.node, insertBeforeNode);
    } else {
      throw Utils.generateError(`Tried to append table but did not supply any of the` +
        ` valid options (appendChild, insertBefore) with either a string ID or` +
        ` HTMLElement node.`);
    }

    draw();
  }

  this.update = () => {
    draw();
  }

  // filter the table contents
  this.search = (options) => {
    /*
    options:
        whitelistTerms - at least one of these strings must be found in a row for a match
        blacklistTerms - if any of these strings are found in a row, they are not a match
        whitelistColumns - only search in columns with these headers
        blacklistColumns - search in all columns other than those with these headers

        including both whitelistColumns and blacklistColumns will throw an error
        including both whitelistTerms and blacklistTerms is fine
    */
  }

  /* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR */

  this._props = {}; // holds all the private properties that the user won't need to see
  this._props.options = options;
  this.objects = itemList; // this is only a reference, so when the external itemList gets updated, the internal itemList does as well
  this._props.containerClass = options.containerClass || null;
  this._props.columnClass = options.columnClass || null;
  this._props.headerClass = options.headerClass || null;
  this._props.cellClass = options.cellClass || null;
  this.columnHeaders = options.columnHeaders;

  this._props.propertyMap = (() => {
    if (options.headerMap === undefined) {
      return undefined;
    }

    // reverses the header map so the draw function can get a property name from
    // a column header title
    const map = {};
    for (const propertyName in options.headerMap) {
      const headerTitle = options.headerMap[propertyName];
      map[headerTitle] = propertyName;
    }

    return map;
  })()

  // set column width value
  if (options.columnWidths) {
    this._props.gridTemplate = options.columnWidths;
  } else {
    // column widths default to 1fr
    this._props.gridTemplate = '1fr,'.repeat(this.columnHeaders.length).split(',');
    this._props.gridTemplate.pop(); // last element in array will be empty
  }

  /* initialize some internal properties */

  this.node = createContainer();
  this.offset = 0;
  this._props.rowCount = 20;

  // create scroll bar if required
  if (options.scrollBar) {
    createScrollBar();
  }
}
return function(itemList, options) {
  /*
    required

      itemList: array of objects

    options

      orientation: column/row : default=row
      containerClass: *string class name*
      cellClass: *string class name*
      rowClass: *string class name*
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
      break;
    case 'mutual':
      options.columnHeaders = Utils.findMutualProperties(itemList);
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
}})();