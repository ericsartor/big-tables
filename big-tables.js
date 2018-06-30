const BigTable = (function() {const style = document.createElement('style');
  style.innerHTML = `
  .big-table-scroll-bar-track {
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

  // loop through array of objects and find the properties common between them
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
  /* PRIVATE CONSTANTS */

  const NO_VALUE = '[no value]';

  /* PRIVATE METHODS */

  const createContainer = () => {
    // whole table container
    const container = document.createElement('div');
    container.className = `big-table-container ${this._props.containerClass || ''}`;
    container.style.display = 'grid';
    container.style.gridTemplate = `1fr / 1fr ` +
      `${this._props.options.scrollBar ? ` 30px` : ''}`;

    // container for column nodes
    const columnContainer = document.createElement('div');
    columnContainer.className = `big-table-column-container`;
    columnContainer.style.display = 'grid';
    columnContainer.style.gridTemplate = `1fr / ` +
      `${this._props.gridTemplate.join(' ')}`;

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
  };

  const createColumn = () => {
    const columnDiv = document.createElement('div');
    columnDiv.className = `big-table-column ${this._props.columnClass || ''}`;

    return columnDiv;
  };

  const createHeader = (headerName) => {
    const headerDiv = document.createElement('div');
    headerDiv.className = `big-table-header ${this._props.headerClass || ''}`;
    headerDiv.textContent = headerName;
    headerDiv.style.display = 'grid';

    return headerDiv;
  };

  const createValueCell = (value, rowNumber, columnName) => {
    const valueCellDiv = document.createElement('div');
    valueCellDiv.className = `big-table-value-cell big-table-row-${rowNumber}` +
      ` big-table-${columnName}-value-cell ${this._props.cellClass || ''}`;
    valueCellDiv.textContent = value;

    const tableContainer = this.node;

    // enable text selecting for the column the hovered value cell is in
    valueCellDiv.addEventListener('mouseover', function(e) {
      const allValueCells = Array.from(
        tableContainer.getElementsByClassName(`big-table-value-cell`)
      );

      const valueCellsToEnableSelectOn = Array.from(
        e.ctrlKey ?
        Array.from(
          // value cells in the same row as the hovered cell
          tableContainer.getElementsByClassName(`big-table-row-${rowNumber}`)
        ) :
        Array.from(
          // value cells in the same column as the hovered cell
          tableContainer.getElementsByClassName(`big-table-${columnName}-value-cell`)
        )
      );

      const valueCellsToDisableSelectOn = allValueCells.filter((valueCell) => {
        return !valueCellsToEnableSelectOn.includes(valueCell);
      });

      valueCellsToEnableSelectOn.forEach((cell) => {
        cell.classList.add('enable-select')
      });

      valueCellsToDisableSelectOn.forEach((cell) => {
        cell.classList.remove('enable-select')
      });
    });

    return valueCellDiv;
  };

  const getCurrentObjectList = () => {
    return this._props.sortedList || this._props.filteredList || this.objects;
  };

  const getValueCells = () => {
    return Array.from(this.node.getElementsByClassName('big-table-value-cell'));
  };

  const draw = () => {
    const objectListToUse = getCurrentObjectList();

    // create the columns and headers if they don't already exist
    if (!this._props.columnDivs) {
      this._props.columnDivs = {};
      for (const headerTitle of this.columnHeaders) {
        const columnDiv = createColumn();
        this._props.columnDivs[headerTitle] = columnDiv;
        this._props.columnContainer.appendChild(columnDiv);
        
        const headerDiv = createHeader(headerTitle);
        columnDiv.appendChild(headerDiv);
      }
    }

    // create document fragments for the value cells for each column div
    const valueCellFragements = {};
    for (const headerTitle of this.columnHeaders) {
      valueCellFragements[headerTitle] = document.createDocumentFragment();

      // create all the value cells for this column, getting the property name
      // from either the propertyMap if a headerMap was provided, or the
      // headerTitle if not (which is the property name)
      const propertyName = this.propertyMap ? 
        this.propertyMap[headerTitle] : headerTitle;

      for (let i = this.offset; i < this._props.rowCount + this.offset; i++) {
        const currentObj = objectListToUse[i];

        // if the current list can't fill the table, break out early
        if (currentObj === undefined) break;

        const cellValue = currentObj[propertyName] !== undefined ?
          currentObj[propertyName] : NO_VALUE;
        
        const valueCellDiv = createValueCell(cellValue, i, propertyName);
        valueCellFragements[headerTitle].appendChild(valueCellDiv);
      }
    }
    
    // erase all the current value cells
    getValueCells().forEach((cell) => cell.remove());

    // append the value cells totheir columns
    for (const headerTitle in this._props.columnDivs) {
      this._props.columnDivs[headerTitle].appendChild(
        valueCellFragements[headerTitle]
      );
    }
  };

  const updateTableForNewList = () => {
    this.offset = 0;
    if (this._props.options.scrollBar) {
      this._props.scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      updateScrollHead();
    }
    draw();
  };

  const updateSort = () => {
    this.sort({
      propertyName: this.currentSortProperty,
      direction: this.currentSortDirection
    });
  };

  /* SCROLLING STUFF */

  // returns the maximum the table offset can be without showing blank space
  const determineMaxOffset = () => {
    return getCurrentObjectList().length - this._props.rowCount;
  };

  const determineMaxScrollBarTop = () => {
    return 100 - parseFloat(this._props.scrollBarHead.style.height);;
  };

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
  };

  const createScrollBar = () => {
    const scrollBarTrack = document.createElement('div');
    scrollBarTrack.className = `big-table-scroll-bar-track ` +
      `${this._props.scrollBarTrackClass || ''}`;

    this._props.scrollBarTrack = scrollBarTrack;

    const scrollBarHead = document.createElement('div');
    scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
    scrollBarHead.className = `big-table-scroll-bar-head ` +
      `${this._props.scrollBarHeadClass || ''}`;
    
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
  };

  const updateScrollHead = () => {
    const maximumTop = determineMaxScrollBarTop();
    const maxOffset = determineMaxOffset();
    const newTop = (this.offset / maxOffset) * maximumTop;
    this._props.scrollBarHead.style.top = newTop + '%';
  };

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
        visibleObjects: getCurrentObjectList().slice(
          this.offset, this.offset + this._props.rowCount
        )
      }
    }));
  };

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
          throw Utils.generateError(`Tried to append table to page using ` +
            ` insertBefore option, but string argument was not an existing ID: ` +
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
      throw Utils.generateError(`Tried to append table but did not supply any ` +
        ` of thevalid options (appendChild, insertBefore) with either a string` +
        `  ID orHTMLElement node.`);
    }

    draw();
  };

  this.update = () => {
    draw();
  };

  // filter the table contents
  this.search = (options) => {
    /*
    options:
        whitelistTerms: Array - at least one of these strings must be found 
          in a row for a match
        blacklistTerms: Array - if any of these strings are found in a row,
          they are not a match
        whitelistProperties: Array - only search in these properties
        blacklistProperties: Array - do not search in these properties
        whitelistMatchAll: Boolean - if this is true, ALL of the whitelist
          terms must be found for a row to be a match
        caseSensitive: Boolean - if true, matches must be case sensitive
    */

    // check the properties to assert they are either strings or arrays of strings
    // if string, create single item array from it
    // otherwise, throw error
    const validateStringOrArrayOfStrings = (propertyName) => {
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
      validateStringOrArrayOfStrings('whitelistTerms');
    }

    if (options.blacklistTerms) {
      validateStringOrArrayOfStrings('blacklistTerms');
    }

    if (options.whitelistProperties) {
      validateStringOrArrayOfStrings('whitelistProperties');
      validateColumns('whitelistProperties');
    }

    if (options.blacklistProperties) {
      validateStringOrArrayOfStrings('blacklistProperties');
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

    // utility function for checking for a match against both whitelist
    // and blacklist terms
    const checkForMatch = (stringToSearch, term) => {
      return options.caseSensitive ?
        stringToSearch.indexOf(term) !== -1 :
        stringToSearch.toLowerCase().indexOf(term.toLowerCase()) !== -1;
    }

    // populate filtered lists with objects matching the whitelist conditions
    let termsMatched = [];
    if (options.whitelistTerms) {
      // remove empty values
      options.whitelistTerms = options.whitelistTerms.filter((term) => term.trim());

      this.objects.forEach((obj) => {
        // don't bother initializing this variable if it isn't needed
        // this will keep track of the remaining unmatched terms for
        // whitelistMatchAll matches
        let termsThisObjectHasntMatched = options.whitelistMatchAll ? 
          [].concat(options.whitelistTerms) : null;

        propertiesToCheck.some((objProp) => {
          // flag for if it's been determined that this object is a match
          let foundMatch = false;

          const remainingMatchesCopy = [].concat(termsThisObjectHasntMatched);

          // try each whitelist term on the current property value
          const termsToLoopThrough = options.whitelistMatchAll ? 
            remainingMatchesCopy : options.whitelistTerms;

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
              // if whitelistMatchAll flag is on, remove this term from the
              // terms left to match
              termsThisObjectHasntMatched.splice(
                termsThisObjectHasntMatched.indexOf(term), 1
              );
              
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
    } else {
      // if there is no whitelist, all items match by default
      this._props.filteredList = [].concat(this.objects);
    }

    // remove objects from the filtered list that have a blacklist match
    if (options.blacklistTerms) {
      // remove empty values
      options.blacklistTerms = options.blacklistTerms.filter((term) => term.trim());

      // need a copy of the list so we can remove items from the filteredList
      // without affecting the array we are iterating through
      const filteredListReverseCopy = [].concat(this._props.filteredList).reverse();
      
      // track which index of the objects array we are on
      let i = filteredListReverseCopy.length - 1;

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

    // if the table was already sorted, sort the filtered list in the same way
    if (this._props.sortedList) {
      updateSort();
    }

    // filtering is complete, draw the update and update the scrollbar
    updateTableForNewList();

    this.node.dispatchEvent(new CustomEvent('btsearch', {
      detail: {
        results: this._props.filteredList,
        termsMatched: termsMatched,
        termsNotMatched: (options.whitelistTerms || []).filter((term) => {
          return !termsMatched.includes(term);
        }),
        propertiesChecked: propertiesToCheck,
        columnsChecked: propertiesToCheck.map((propertyName) => {
          return this.headerMap[propertyName];
        })
      }
    }));
  };

  this.clearSearch = () => {
    this._props.filteredList = null;

    // this will update the sorted list with a sort on the master list
    if (this._props.sortedList) {
      updateSort();
    }

    updateTableForNewList();

    this.node.dispatchEvent(new CustomEvent('btclearsearch'));
  };

  this.sort = (options) => {
    /*
      columnName: string - the column header value to sort by, cannot be
        supplied if propertyname is also supplied
      propertyName: string - the item property to sort by, cannot be
        supplied if columnName is also supplied
      direction: string - up, down, asc, desc
    */

    // assert that columnName or propertyName were provided, not both or neither
    if (!(!!options.propertyName ^ !!options.columnName)) {
      if (options.propertyName && options.columnName) {
        throw Utils.generateError(`You cannot provide both a propertyName` +
          ` and a columnName to the sort API.`);
      } else {
        throw Utils.generateError(`You must provide either a propertyName` +
          ` or a columnName to the sort API.`);
      }
    }

    // assert that whatever was provided is either a valid property name
    // or column header
    if (options.propertyName) {
      if (!this._props.properties.includes(options.propertyName)) {
        throw Utils.generateError(`The property name provided to the sort()` +
          ` function is not one of the current table's properties: ` +
          options.propertyName);
      }
    } else {
      if (!this.headerMap) {
        throw Utils.generateError(`A column name was provided to the sort()` +
          ` function, but there is no headerMap present for the table.`);
      }

      if (!this.propertyMap[options.columnName]) {
        throw Utils.generateError(`The column name provided to the sort()` +
          ` function is not one of the current table's column names: ` +
          options.columnName);
      }
    }

    // assert that direction is one of the accepted values
    const directions = ['up', 'down', 'asc', 'desc'];
    if (options.direction && !directions.includes(options.direction)) {
      throw Utils.generateError(`The sort direction provided is not one of the` +
        ` accepted values: ` + options.direction);
    }

    // normalize sort identifier to a property name
    const sortPropertyName = options.propertyName || 
      this.propertyMap[options.columnName];

    // normalize sort direction to either 'asc' or 'desc'
    const direction = (() => {
      if (['up', 'down'].includes(options.direction)) {
        return ({'up': 'asc', 'down': 'desc'})[options.direction];
      } else if (options.direction) {
        return options.direction;
      } else {
        return 'desc';
      }
    })();

    this.currentSortProperty = sortPropertyName;
    this.currentSortDirection = direction;

    const sortHierarchy = (() => {
      if (this._props.sortOrderMap && this._props.sortOrderMap[sortPropertyName]) {
        return [sortPropertyName].concat(this._props.sortOrderMap[sortPropertyName]);
      } else {
        return [sortPropertyName];
      }
    })();

    // nullify the sorted list so that if there already was a sorted list,
    // we wont be re-sorting that list, but instead sorted either a filtered
    // list or the master list
    this._props.sortedList = null;

    // creates a multi-dimensional ray as deep as the sort hierarchy where
    // the fundamental objects are in the desired sort order
    const sortedObjsArr = (function sortListForProp(list, prop) {
      /*
        let map = {
          'value1': [arr of objs...],
          'value2': [arr of objs...],
          'value3': [arr of objs...],
          ...
        }
      */
     // sort the objects into arrays of identical values for current property
      let map = {};
      list.forEach((obj) => {
        const objValue = (() => {
          if (obj[prop]) {
            return obj[prop].ToString ? obj[prop].ToString() : obj[prop];
          } else {
            return '0';
          }
        })();        
        
        if (map[objValue]) {
          map[objValue].push(obj);
        } else {
          map[objValue] = [obj];
        }
      });
    
      // if there is a next property in the hierarchy, take the current map
      // values (arrays of objects) and create a sorted map for it and return
      // an array of the resulting values
      if (sortHierarchy.length) {
        const nextProp = sortHierarchy.shift();
        for (const valueKey in map) {
          map[valueKey] = sortListForProp(map[valueKey], nextProp);
        }
        sortHierarchy.unshift(nextProp);
      }
    
      // take the current map values and put them in an array in the sorted
      // order of their keys
      let orderedGroups = Object.keys(map)
      .sort((a, b) => {
        const aAsNumber = Number(a);
        const bAsNumber = Number(b);

        a = isNaN(aAsNumber) ? a : aAsNumber;
        b = isNaN(bAsNumber) ? b : bAsNumber;

        if (a < b) return direction === 'asc' ? -1 : 1;
        else if (a > b) return direction === 'asc' ? 1 : -1;
        else return 0;
      })
      .map((valueKey) => {
        return map[valueKey];
      });
    
      return orderedGroups;
    })(getCurrentObjectList(), sortHierarchy.shift());

    // take the completed sort array and reduce it to a one dimensional array
    const sortedObjs = [];
    (function readArray(arr) {
      arr.forEach((item) => {
        if (Array.isArray(item)) {
          readArray(item);
        } else {
          sortedObjs.push(item);
        }
      });
    })(sortedObjsArr);
    
    this._props.sortedList = sortedObjs;
    updateTableForNewList();

    // put the main sort property name back on the hierarchy for the event details
    sortHierarchy.unshift(sortPropertyName);
    
    this.node.dispatchEvent(new CustomEvent('btsort', {
      detail: {
        sortHierarchy: sortHierarchy
      }
    }));
  };

  this.clearSort = () => {
    this._props.sortedList = null;
    this.currentSortProperty = null;
    this.currentSortDirection = null;
    updateTableForNewList();

    this.node.dispatchEvent(new CustomEvent('btclearsort'));
  };

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
  this._props.sortOrderMap = options.sortOrderMap || null;
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
  })();

  // set column width value
  if (options.columnWidths) {
    // loop through the provided column widths map and push their values to an 
    // array in the order the properties were provided in, filling in 1fr for 
    // any missing values
    this._props.gridTemplate = [];
    this._props.properties.forEach((propertyName) => {
      // if the value is in the columnWidths map under the propery name or column header,
      // it will be stored here
      const value = options.columnWidths[propertyName] || 
        options.columnWidths[this.headerMap[propertyName]] || false;
      
      // push 1fr if a value wasn't provided for the current property name
      this._props.gridTemplate.push(value || '1fr');
    });
  } else {
    // column widths default to equal percentage values
    this._props.gridTemplate = `${100 / this.columnHeaders.length}%,`
      .repeat(this.columnHeaders.length).split(',');
    this._props.gridTemplate.pop(); // last element in array will be empty
  }

  /* initialize some internal properties */

  this.node = createContainer();
  this._props.columnContainer = this.node.getElementsByClassName('big-table-column-container')[0];
  this.currentSortProperty = null;
  this.currentSortDirection = null;

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
    'containerClass',
    'headerClass',
    'columnClass',
    'cellClass',
    'scrollBarTrackClass',
    'scrollBarHeadClass',
    'scrollBar',
    'propertyMode',
    'properties',
    'headerMap',
    'columnWidths',
    'sortOrderMap'
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