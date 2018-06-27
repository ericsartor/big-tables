function BigTable(itemList, options) {
  /* PRIVATE METHODS */

  const createContainer = () => {
    // whole table container
    const container = document.createElement('div');
    container.className = `big-table-container ${this._props.containerClass || ''}`;
    container.style.display = 'grid';
    container.style.gridTemplate = `1fr / 1fr ${this._props.options.scrollBar ? ` 30px` : ''}`;

    // container for column nodes
    const columnContainer = document.createElement('div');
    columnContainer.className = `big-table-column-container`;
    columnContainer.style.display = 'grid';
    columnContainer.style.gridTemplate = `1fr / ${this._props.gridTemplate.join(' ')}`;

    // container for the scroll bar
    const scrollBarContainer = document.createElement('div');
    scrollBarContainer.className = `big-table-scroll-bar-container`;
    scrollBarContainer.style.display = 'grid';
    scrollBarContainer.style.gridTemplate = `1fr / 1fr`;

    container.appendChild(columnContainer);

    if (this._props.options.scrollBar) {
      container.appendChild(scrollBarContainer);
    }

    // listener for table scrolling
    container.addEventListener('wheel', (e) => {
      e.preventDefault();

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
      const propertyName = this.propertyMap ? this.propertyMap[headerTitle] : headerTitle;
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
    for (let i = this._props.columnContainer.children.length - 1; i >= 0; i--) {
      if (!this._props.columnContainer.children[i].classList.contains('big-table-scroll-bar-track')) {
        this._props.columnContainer.children[i].remove();
      }
    }

    this._props.columnContainer.appendChild(columnDivs);
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
    const scrollBarTrack = document.createElement('div');
    scrollBarTrack.className = `big-table-scroll-bar-track ${this._props.scrollBarTrackClass || ''}`;
    this._props.scrollBarTrack = scrollBarTrack;

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

      const trackRect = this._props.scrollBarTrack.getBoundingClientRect();

      if (e.clientY < trackRect.top) {
        performScroll(-this.offset);
      } else if (e.clientY > trackRect.bottom) {
        performScroll(determineMaxOffset() - this.offset);
      } else {
        const totalPixelsOfMovement = determineMaxScrollBarTop() / 100 * trackRect.height;
        const rowsPerPixel = getCurrentObjectList().length / totalPixelsOfMovement;
        const moveAmountPixels = e.clientY - that._props.scrollBarGrabPreviousY;
        const totalRowsMoved = rowsPerPixel * moveAmountPixels;
  
        
        performScroll(Math.round(totalRowsMoved));
      }

      that._props.scrollBarGrabPreviousY = e.clientY;
      updateScrollHead();
    })

    scrollBarTrack.appendChild(scrollBarHead);
    this._props.scrollBarContainer.appendChild(scrollBarTrack);
  }

  const updateScrollHead = () => {
    const maximumTop = determineMaxScrollBarTop();
    const maxOffset = determineMaxOffset();
    const newTop = (this.offset / maxOffset) * maximumTop;
    this._props.scrollBarHead.style.top = newTop + '%';
  }

  // updates the table offset then re-draws table, firing the the btscroll event
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

    
    this.node.dispatchEvent(new CustomEvent('btscroll', {
      detail: {
        tableOffset: this.offset,
        rowCount: this._props.rowCount,
        steps: steps,
        visibleObjects: getCurrentObjectList().slice(this.offset, this.offset + this._props.rowCount)
      }
    }));
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
        whitelistProperties: Array - only search in these properties
        blacklistProperties: Array - do not search in these properties
        whitelistMatchAll: Boolean - if this is true, ALL of the whitelist terms must be found for a row to be a match
        caseSensitive: Boolean - if true, matches must be case sensitive
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
        return !this._props.properties.includes(name);
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

    if (options.whitelistProperties) {
      validateStringOrArray('whitelistProperties');
      validateColumns('whitelistProperties');
    }

    if (options.blacklistProperties) {
      validateStringOrArray('blacklistProperties');
      validateColumns('blacklistProperties');
    }

    // ready to start filtering, initialize filtered list
    this._props.filteredList = [];

    // create the list of properties to check for matches in based on what the
    // user provided in the whitelist/blaclist property arrays
    const propertiesToCheck = (() => {
      if (options.whitelistProperties || options.blacklistProperties) {
        if (options.whitelistProperties && !options.blacklistProperties) {
          return options.whitelistProperties;
        } else if (options.blacklistProperties && !options.whitelistProperties) {
          return this._props.properties.filter((prop => {
            return !options.blacklistProperties.includes(prop);
          }));
        } else {
          return options.whitelistProperties.filter((prop => {
            return !options.blacklistProperties.includes(prop);
          }));
        }
      } else {
        return this._props.properties;
      }
    })()

    // utility function for checking for a match against both whitelist and blacklist terms
    const checkForMatch = (stringToSearch, term) => {
      return options.caseSensitive ?
        stringToSearch.indexOf(term) !== -1 :
        stringToSearch.toLowerCase().indexOf(term.toLowerCase()) !== -1;
    }

    // populate filtered lists with objects matching the whiteliset conditions
    let termsMatched = [];
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

            const termMatched = checkForMatch(obj[objProp].toString(), term);

            if (termMatched && !options.whitelistMatchAll) {
              // track that this term had a match
              Utils.addIfNotPresent(term, termsMatched);

              // if whitelistMatchAll flag is off, this object is a match
              this._props.filteredList.push(obj);
              foundMatch = true;
              return true;
            } else if (termMatched && options.whitelistMatchAll) {
              // if whitelistMatchAll flag is on, remove this term from the terms left to match
              termsThisObjectHasntMatched.splice(termsThisObjectHasntMatched.indexOf(term), 1);
              
              // track that this term had a match
              Utils.addIfNotPresent(term, termsMatched);

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

          // properties may be undefined it property mode is set to all
          if (obj[objProp] === undefined) return false;

          // try each blacklist term on the property value
          options.blacklistTerms.some((term) => {
            const termMatched = checkForMatch(obj[objProp].toString(), term);

            if (termMatched) {
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

    this.node.dispatchEvent(new CustomEvent('btsearch', {
      detail: {
        results: this._props.filteredList,
        termsMatched: termsMatched,
        termsNotMatched: options.whitelistTerms.filter((term) => {
          return !termsMatched.includes(term);
        }),
        propertiesChecked: propertiesToCheck,
        columnsChecked: propertiesToCheck.map((propertyName) => {
          return this.headerMap[propertyName];
        })
      }
    }));
  }

  this.clearSearch = () => {
    this._props.filteredList = null;
    this.offset = 0;
    if (this._props.options.scrollBar) {
      this._props.scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      updateScrollHead();
    }
    draw();

    this.node.dispatchEvent(new CustomEvent('btclearsearch'));
  }

  /* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR *//* CONSTRUCTOR */

  this._props = {}; // holds all the private properties that the user won't need to see
  this._props.options = options;
  this._props.properties = options.properties; // this is a string list of the object properties to be used as columns
  this.objects = itemList; // this is only a reference, so when the external itemList gets updated, the internal itemList does as well
  this._props.containerClass = options.containerClass || null;
  this._props.columnClass = options.columnClass || null;
  this._props.headerClass = options.headerClass || null;
  this._props.cellClass = options.cellClass || null;
  this._props.scrollBarTrackClass = options.scrollBarTrackClass || null;
  this._props.scrollBarHeadClass = options.scrollBarHeadClass || null;
  this.columnHeaders = options.columnHeaders;

  this.headerMap = options.headerMap;
  this.propertyMap = (() => {
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
    this._props.gridTemplate = `${100 / this.columnHeaders.length}%,`.repeat(this.columnHeaders.length).split(',');
    this._props.gridTemplate.pop(); // last element in array will be empty
  }

  /* initialize some internal properties */

  this.node = createContainer();
  this._props.columnContainer = this.node.getElementsByClassName('big-table-column-container')[0];
  
  /* column-resize stuff */
  
  this._props.isResizing = false;
  
  /* scrolling */
  
  this.offset = 0;
  this._props.rowCount = 20;

  if (this._props.options.scrollBar) {
    this._props.scrollBarContainer = this.node.getElementsByClassName('big-table-scroll-bar-container')[0];
    createScrollBar();
  }
}