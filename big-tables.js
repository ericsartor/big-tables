const BigTable = (function() {const style = document.createElement('style');
  style.innerHTML = `
  .big-table-scroll-bar-container {
    position:relative;
    grid-column:-2;
    grid-row:1;
  }
  .big-table-scroll-bar-head {
    position:relative;
    width:80%;
    margin-left:10%;
  }

  .big-table-header {
    user-select:none;
    overflow:hidden;
    white-space:nowrap;
  }

  .big-table-value-cell {
    user-select:none;
    overflow:hidden;
    white-space:nowrap;
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
    
    // const gridTemplateArr = '1fr,'.repeat(this._props.rowCount).split(',');
    // gridTemplateArr.pop(); // last element in array will be empty
    // columnDiv.style.gridTemplate = `${gridTemplateArr.join(' ')} / 1fr`;

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

  const getCurrentObjectList = () => {
    return this._props.filteredList || this.objects;
  }

  const draw = () => {
    const objectListToUse = getCurrentObjectList();

    // create document fragments for the value cells for each column div
    // simultaneously create the header divs for each column
    const columnFragments = {};
    for (const headerTitle of this.columnHeaders) {
      columnFragments[headerTitle] = document.createDocumentFragment();

      const headerDiv = createHeader(headerTitle);
      columnFragments[headerTitle].appendChild(headerDiv);

      // create all the value cells for this column, getting the property name from either
      // the propertyMap if a headerMap was provided, or the headerTitle if not
      const propertyName = this._props.propertyMap ? this._props.propertyMap[headerTitle] : headerTitle;
      for (let i = this.offset; i < this._props.rowCount + this.offset; i++) {
        const currentObj = objectListToUse[i];

        if (currentObj === undefined) break;

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
    return getCurrentObjectList().length - this._props.rowCount;
  }

  const determineMaxScrollBarTop = () => {
    return 100 - parseFloat(this._props.scrollBarHead.style.height);;
  }

  const determineScrollBarScalingAmount = () => {
    let amount = 100;

    if (getCurrentObjectList().length <= this._props.rowCount) return amount;

    const excessRows = getCurrentObjectList().length - this._props.rowCount;

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
    scrollBarContainer.className = `big-table-scroll-bar-container ${this._props.scrollBarContainerClass || ''}`;
    this._props.scrollBarContainer = scrollBarContainer;

    const scrollBarHead = document.createElement('div');
    scrollBarHead.className = `big-table-scroll-bar-head ${this._props.scrollBarHeadClass || ''}`;
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
        const rowsPerPixel = getCurrentObjectList().length / totalPixelsOfMovement;
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

    if (this._props.options.scrollBar) updateScrollHead();

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
        whitelistTerms: Array - at least one of these strings must be found in a row for a match
        blacklistTerms: Array - if any of these strings are found in a row, they are not a match
        whitelistColumns: Array - only search in columns with these headers
        blacklistColumns: Array - do not search in columns with these headers
        whitelistMatchAll: Boolean - if this is true, ALL of the whitelist terms must be found for a row to be a match
    */

    // check the properties to make sure they are either strings or arrays of strings
    // if string, create single item array from it
    // otherwise, throw error
    const validateStringOrArray = (propertyName) => {
      const value = options[propertyName];

      if (Utils.isString(value)) {
        // if the whitelistTerms value is a string, convert it to a single item array
        options[propertyName] = [value];
      } else if (!Array.isArray(value)) {
        // if the whitelistTerms value isn't a string or Array, throw an error
        throw Utils.generateError(`Search: The value supplied for ${propertyName}` +
          ` was neither a string or an Array: ${value}` +
          ` (${typeof value})`);
      } else {
        // value is an array, make sure it only contains strings
        const foundNonStringValue = value.find((item) => {
          return !Utils.isString(item);
        });

        if (foundNonStringValue) {
          throw Utils.generateError(`Search: The value supplied for ${propertyName}` +
            ` was an Array, but it contained a non-string item:` +
            ` ${foundNonStringValue} (${typeof foundNonStringValue})`);
        }
      }
    }

    const validateColumns = (propertyName) => {
      const columnNames = options[propertyName];
      const invalidColumnName = columnNames.find((name) => {
        return !this.columnHeaders.includes(name);
      });

      if (invalidColumnName) {
        throw Utils.generateError(`A ${propertyName} value was supplied, but` +
        ` it contains an invalid column name: ${invalidColumnName}`);
      }
    }

    // do the validation for whatever was passed into options

    if (options.whitelistTerms) {
      validateStringOrArray('whitelistTerms');
    }

    if (options.blacklistTerms) {
      validateStringOrArray('blacklistTerms');
    }

    if (options.whitelistColumns) {
      validateStringOrArray('whitelistColumns');
      validateColumns('whitelistColumns');
    }

    if (options.blacklistColumns) {
      validateStringOrArray('blacklistColumns');
      validateColumns('blacklistColumns');
    }

    // ready to start filtering, initialize filtered list
    this._props.filteredList = [];

    // create the list of properties to check for matches in
    const propertiesToCheck = (() => {
      if (options.whitelistColumns || options.blacklistColumns) {
        if (options.whitelistColumns && !options.blacklistColumns) {
          return options.whitelistColumns;
        } else if (options.blacklistColumns && !options.whitelistColumns) {
          return this._props.properties.filter((prop => {
            return !options.blacklistColumns.includes(prop);
          }));
        } else {
          return options.whitelistColumns.filter((prop => {
            return !options.blacklistColumns.includes(prop);
          }));
        }
      } else {
        return this._props.properties;
      }
    })()

    // populate filtered lists with objects matching the whiteliset conditions
    if (options.whitelistTerms) {
      this.objects.forEach((obj) => {
        // don't bother initializing this variable if it isn't needed
        // this will keep track of the remaining unmatched terms for whitelistMatchAll matches
        let termsThisObjectHasntMatched = options.whitelistMatchAll ? [].concat(options.whitelistTerms) : null;

        propertiesToCheck.some((objProp) => {
          // flag for if it's been determined that this object is a match
          let foundMatch = false;

          const remainingMatchesCopy = [].concat(termsThisObjectHasntMatched);

          // try each whitelist term on the current property value
          const termsToLoopThrough = options.whitelistMatchAll ? remainingMatchesCopy : options.whitelistTerms;

          termsToLoopThrough.some((term) => {
            // properties may be undefined it property mode is set to all
            if (obj[objProp] === undefined) return false;

            const matchTerm = obj[objProp].toString().match(new RegExp(term, 'i')) !== null;

            if (matchTerm && !options.whitelistMatchAll) {
              // if whitelistMatchAll flag is off, this object is a match
              this._props.filteredList.push(obj);
              foundMatch = true;
              return true;
            } else if (matchTerm && options.whitelistMatchAll) {
              // if whitelistMatchAll flag is on, remove this term from the terms left to match
              termsThisObjectHasntMatched.splice(termsThisObjectHasntMatched.indexOf(term), 1);

              // no terms left to match, this object is a match
              if (termsThisObjectHasntMatched.length === 0) {
                this._props.filteredList.push(obj);
                foundMatch = true;
                return true;
              }
            }
          });

          // cut the some loop short and move on to next object
          return foundMatch;
        });
      });
    }

    // remove objects from the filtered list that have a blacklist match
    if (options.blacklistTerms) {
      const filteredListReverseCopy = [].concat(this._props.filteredList).reverse();
      let i = filteredListReverseCopy.length - 1; // track which index of the pbjets array we are on

      filteredListReverseCopy.forEach((obj) => {
        this._props.properties.some((objProp) => {
          // flag for if a match was found in this property
          let foundMatch = false;

          // try each blacklist term on the property value
          options.blacklistTerms.some((term) => {
            // case insenstive match
            const matchTerm = obj[objProp].toString().match(new RegExp(term, 'i')) !== null;

            if (matchTerm) {
              this._props.filteredList.splice(i, 1);
              foundMatch = true;
              return true;
            }
          });

          // cut the some loop short and move on to next object
          return foundMatch;
        });

        i--;
      });
    }

    // filtering is complete, draw the update and update the scrollbar
    this.offset = 0;
    if (this._props.options.scrollBar) {
      this._props.scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      updateScrollHead();
    }
    draw();
  }

  this.clearSearch = () => {
    this._props.filteredList = null;
    this.offset = 0;
    if (this._props.options.scrollBar) {
      this._props.scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      updateScrollHead();
    }
    draw();
  }

  /* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR */

  this._props = {}; // holds all the private properties that the user won't need to see
  this._props.options = options;
  this._props.properties = options.properties;
  this.objects = itemList; // this is only a reference, so when the external itemList gets updated, the internal itemList does as well
  this._props.containerClass = options.containerClass || null;
  this._props.columnClass = options.columnClass || null;
  this._props.headerClass = options.headerClass || null;
  this._props.cellClass = options.cellClass || null;
  this._props.scrollBarContainerClass = options.scrollBarContainerClass || null;
  this._props.scrollBarHeadClass = options.scrollBarHeadClass || null;
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
  if (this._props.options.scrollBar) {
    createScrollBar();
  }
}
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
}})();