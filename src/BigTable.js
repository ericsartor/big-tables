function BigTable(itemList, options) {
  /* PRIVATE CONSTANTS */

  // this is the value printed to a value cell when a property doesn't exist
  // on the object being drawn
  const NO_VALUE = '[no value]';



  /* IMPORTS */

  // functions for creating of container divs, columns, headers and cells
  // IMPORT::node-creation.js

  // functions for handling row selection when value cells are clicked
  // IMPORT::row-selection.js

  // functions for creating and giving function to both scroll bars
  // IMPORT::VerticalScrollBar.js
  // IMPORT::HorizontalScrollBar.js



  /* VALUE REQUEST FUNCTIONS */

  // returns the list that the user is actually looking at at any given time
  const getCurrentObjectList = () => {
    return this._props.sortedList || this._props.filteredList || this.masterList;
  };

  // get the column nodes in their current order in the table
  const getColumnNodes = () => {
    return Array.from(this._props.columnContainer.children);
  };

  // gets all current value cells in no particular order
  const getValueCells = () => {
    return Array.from(this.node.getElementsByClassName('big-table-value-cell'));
  };

  // gets the header title for a column from a property name
  const getHeaderTitle = (propertyName) => {
    return this.headerMap ? this.headerMap[propertyName] : propertyName;
  };

  // gets the current column grid template as an array for use with column
  // movement logic
  const getColumnContainerGridTemplateArray = () => {
    return this._props.columnContainer.style.gridTemplateColumns.split(' ');
  };



  /* VALUE UPDATE FUNCTIONS */

  // easily update a specific column grid template value by index
  const updateColumnGridTemplate = (i, value) => {
    const gridTemplateString = this._props.columnContainer.style
      .gridTemplateColumns;
    const gridTemplateArr = gridTemplateString.split(' ');
    gridTemplateArr[i] = value;

    this._props.columnContainer.style.gridTemplateColumns = gridTemplateArr.join(' ');
  };



  /* functions for applying user supplied event listeners to nodes */

  // check to see if any listeners were provided for the given type of node 
  // (headers, cells, etc) and the given property/column
  const findListenerObjectsFor = (listenerType, propertyName) => {
    // figure out if a listener was provided for this type (header/value cell)
    const listenersFromPropertyName =
      this._props[listenerType + 'Listeners'][propertyName];
    const listenersFromAll = this._props[listenerType + 'Listeners']['all'];
    const listenerObjects = listenersFromPropertyName || listenersFromAll;

    return listenerObjects;
  };

  // take an array of listener objects and apply them to the supplied node
  const applyListenerObjects = (type, node, listenerObjects, propertyName, object) => {
    if (listenerObjects) {
      listenerObjects.forEach((listenerObject) => {
        const {eventName, listener} = listenerObject;
        
        if (type === 'header') {
          node.addEventListener(eventName, (e) => {
            listener(e, {
              node,
              propertyName: propertyName,
              headerTitle: this.headerMap[propertyName] || propertyName,
            });
          });
        } else if (type === 'cell') {
          node.addEventListener(eventName, (e) => {
            listener(e, {
              node,
              propertyName: propertyName,
              headerTitle: this.headerMap[propertyName] || propertyName,
              object
            });
          });
        }
          
      });
    }
  };

  
  /* DRAWING FUNCTIONS */

  // creates the columns and column headers if they aren't present, then
  // dletes all current value cells and creates new value cells based on the
  // current offset and current item list
  const draw = () => {
    // create the columns and headers if they don't already exist
    if (!this._props.columnDivs) {
      // map of property names to column nodes
      this._props.columnDivs = {};
      
      // create a column and header node for each item property in the table
      for (const propertyName of this.itemProperties) {
        const columnDiv = createColumn();
        this._props.columnDivs[propertyName] = columnDiv;
        this._props.columnContainer.appendChild(columnDiv);
        
        const headerTitle = getHeaderTitle(propertyName);
        const headerDiv = createHeader(headerTitle);
        columnDiv.appendChild(headerDiv);
        
        // apply user supplied listeners to the header if there are any
        if (this._props.headerListeners) {
          const listenerObjects = findListenerObjectsFor('header', propertyName);
          applyListenerObjects('header', headerDiv, listenerObjects, propertyName);
        }
      }
    }

    // grab a reference to the current list once instead in each loop iteration
    const objectListToUse = getCurrentObjectList();

    // map of document fragments for the value cells for each column node
    const valueCellFragements = {};

    // create the values cells for each column node
    for (const propertyName of this.itemProperties) {
      valueCellFragements[propertyName] = document.createDocumentFragment();

      // create all the value cells for this column
      for (let i = this.offset; i < this._props.rowCount + this.offset; i++) {
        const currentObj = objectListToUse[i];

        // if the current list can't fill the table, break out early
        if (currentObj === undefined) break;

        const cellValue = currentObj[propertyName] !== undefined ?
          currentObj[propertyName] : NO_VALUE;
        
        const valueCellDiv = createValueCell(
          cellValue, i, propertyName, currentObj
        );

        valueCellFragements[propertyName].appendChild(valueCellDiv);

        // apply user supplied listeners to the header if there are any
        if (this._props.cellListeners) {
          const listenerObjects = findListenerObjectsFor('cell', propertyName);
          applyListenerObjects(
            'cell', valueCellDiv, listenerObjects, propertyName, currentObj
          );
        }
      }
    }
    
    // erase all the current value cells
    getValueCells().forEach((cell) => cell.remove());

    // append the value cells to their columns
    for (const propertyName in this._props.columnDivs) {
      this._props.columnDivs[propertyName].appendChild(
        valueCellFragements[propertyName]
      );
    }
  };

  // used when the table contents need to change other than when scrolling,
  // such as when filtering, sorting, or clearing either of those
  const updateTableForNewList = () => {
    this.offset = 0;
    if (this._props.showVerticalScrollBar) {
      this._props.scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      updateScrollHead();
    }
    draw();
  };

  // used to maintain the current sort after the table list gets changed, such
  // as after a filter or a clear filter
  const updateSort = () => {
    this.sort({
      propertyName: this.currentSortProperty,
      direction: this.currentSortDirection
    }, true);
  };



  /* PUBLIC METHODS AND PROPERTIES */

  // this simply exposes the "clearSelection" function used for removing all
  // row selections so the user can call it
  this.clearSelection = () => {
    clearSelection();
    draw();
  };

  // used to actually place the table node on the page by supplying either a
  // parent node or a sibling as a reference
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

  // so far this isn't being used for anything...
  this.update = () => {
    draw();
  };

  // filter the table contents 
  this.filter = (options) => {
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
        throw Utils.generateError(`Filter: The value supplied for ${propertyName}` +
          ` was neither a string or an Array: ${value}` +
          ` (${typeof value})`);
      } else {
        // value is an array, make sure it only contains strings
        const foundNonStringValue = value.find((item) => {
          return !Utils.isString(item);
        });

        if (foundNonStringValue) {
          throw Utils.generateError(`Filter: The value supplied for ${propertyName}` +
            ` was an Array, but it contained a non-string item:` +
            ` ${foundNonStringValue} (${typeof foundNonStringValue})`);
        }
      }
    }

    const validateColumns = (propertyName) => {
      const columnNames = options[propertyName];
      const invalidColumnName = columnNames.find((name) => {
        return !this.itemProperties.includes(name);
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
          return this.itemProperties.filter((prop => {
            return !options.blacklistProperties.includes(prop);
          }));
        } else {
          return options.whitelistProperties.filter((prop => {
            return !options.blacklistProperties.includes(prop);
          }));
        }
      } else {
        return this.itemProperties;
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

      this.masterList.forEach((obj) => {
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
      this._props.filteredList = [].concat(this.masterList);
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
        this.itemProperties.some((objProp) => {
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

    this.node.dispatchEvent(new CustomEvent('btfilter', {
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

  this.clearFilter = () => {
    this._props.filteredList = null;

    // this will update the sorted list with a sort on the master list
    if (this._props.sortedList) {
      updateSort();
    }

    updateTableForNewList();

    this.node.dispatchEvent(new CustomEvent('btclearfilter'));
  };

  this.sort = (options, performingSortUpdate) => {
    /*
      columnName: string - the column header value to sort by, cannot be
        supplied if propertyname is also supplied
      propertyName: string - the item property to sort by, cannot be
        supplied if columnName is also supplied
      direction: string - up, down, asc, desc
      algorithm: string - name of the sorting algorithm to use
    */

   if (
      this._props.previousDragTime !== undefined &&
      performance.now() - this._props.previousDragTime < 50
    ) {
      return;
    }

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
      if (!this.itemProperties.includes(options.propertyName)) {
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

    // assert that algorithm is one of the accepted values
    if (options.algorithm && !Sorting.algorithms.includes(options.algorithm)) {
      throw Utils.generateError(`The sorting algorithm provided is not one of` +
        ` the built in algorithms: "${options.algorithm}". The built in`
        ` algorithms are: ${Sorting.algorithms.join(', ')}`);
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

    // determine and create the sort hierarchy for this sort
    const sortHierarchy = (() => {
      if (this._props.sortOrderMap && this._props.sortOrderMap[sortPropertyName]) {
        return [sortPropertyName].concat(this._props.sortOrderMap[sortPropertyName]);
      } else {
        return [sortPropertyName];
      }
    })();

    // wipe the sorted list before sorting when we're doing an update after a 
    // filter so that the current list is the filtered list
    if (performingSortUpdate) {
      this._props.sortedList = null;
    }
    
    const sortBenchmarkStartTime = performance.now();

    const resortingCurrentSortColumn = this.currentSortProperty ===
      sortHierarchy[0];
    const reversingSortDirection = this.currentSortDirection !== null &&
      this.currentSortDirection !== direction;

    let algorithmToUse;

    if (
      resortingCurrentSortColumn &&
      reversingSortDirection &&
      !performingSortUpdate
    ) {
      // if resorting current column and reversing it, simply do a reverse
      algorithmToUse = 'reverse';
      this._props.sortedList.reverse();
    } else if (!resortingCurrentSortColumn || performingSortUpdate) {
      // if sorting a new column, do a new sort

      algorithmToUse = options.algorithm ||
        this._props.fastestBenchmarkMap[sortPropertyName].algorithmName ||
        'btsort';

      switch (algorithmToUse) {
        case 'btsort':
          this._props.sortedList = Sorting.btsort(
            getCurrentObjectList(),
            sortHierarchy,
            direction
          );
          break;  
        case 'javascript':
          // create a list copy for sorting in place
          const currentListCopy = [].concat(getCurrentObjectList());

          this._props.sortedList = Sorting.javascript(
            currentListCopy,
            sortHierarchy,
            direction
          );
          break;
      }
    }

    const sortBenchmarkTotalTime = performance.now() - sortBenchmarkStartTime;

    // update state properties
    this.currentSortProperty = sortPropertyName;
    this.currentSortDirection = direction;

    updateTableForNewList();
    
    this.node.dispatchEvent(new CustomEvent('btsort', {
      detail: {
        sortHierarchy: sortHierarchy,
        sortBenchmark: sortBenchmarkTotalTime,
        algorithm: algorithmToUse
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

  // holds all the private properties that the user won't need to see
  this._props = {};

  // this is a string list of the object properties to be used as columns
  // this was either provided by the user (and validated) or determined
  // by a utility function based on the property mode designated by the user
  this.itemProperties = options.properties;

  // this is only a reference, so when the external itemList gets updated,
  // the internal itemList does as well
  this.masterList = itemList;

  // CSS classes defined by the user
  this._props.containerClass = options.containerClass || null;
  this._props.columnClass = options.columnClass || null;
  this._props.headerClass = options.headerClass || null;
  this._props.cellClass = options.cellClass || null;
  this._props.scrollBarTrackClass = options.scrollBarTrackClass || null;
  this._props.scrollBarHeadClass = options.scrollBarHeadClass || null;
  this._props.horizontalScrollBarTrackClass = options.horizontalScrollBarTrackClass || null;
  this._props.horizontalScrollBarHeadClass = options.horizontalScrollBarHeadClass || null;

  // optional parameters supplied by user
  this._props.themeName = options.theme || 'btdefault';
  this._props.sortOrderMap = options.sortOrderMap || null;
  this._props.valueParseFunctions = options.valueParseFunctions || null;
  this._props.headerListeners = options.headerListeners || null;
  this._props.cellListeners = options.cellListeners || null;
  this._props.columnWidths = options.columnWidths || null;

  // flag options supplied by user
  this._props.showVerticalScrollBar = options.showVerticalScrollBar || false;
  this._props.showHorizontalScrollBar = options.showHorizontalScrollBar || false;
  this._props.enableSelection = options.enableSelection || false;
  this._props.enableColumnResizing = options.enableColumnResizing || false;
  this._props.enableMoveableColumns = options.enableMoveableColumns || false;
  this._props.optimizeSorting = options.optimizeSorting || false;

  /* store the optional parameters the user may need access to in the main
     object (not in ._props) */

  this.headerMap = options.headerMap || null;

  // this is the inverse of the headerMap, it can be used to get a property name
  // from a column header (only exists if the user provided a headerMap)
  if (this.headerMap === undefined) {
    this.propertyMap = (() => {
      // reverses the header map so the draw function can get a property name from
      // a column header title
      const map = {};
      for (const propertyName in options.headerMap) {
        const headerTitle = options.headerMap[propertyName];
        map[headerTitle] = propertyName;
      }
  
      return map;
    })();
  }  

  /* set up the grid template for the columns depending on if the user
     supplied specific widths for any of the columns */

  if (options.columnWidths) {
    // loop through the provided column widths map and push their values to an 
    // array in the order the properties are provided in this.itemProperties,
    // filling in "1fr" for any missing values
    this._props.gridTemplate = [];
    this.itemProperties.forEach((propertyName) => {
      // if the value is in the columnWidths map under the property name or 
      // column header, it will be stored here
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

  /* give user access to the table's node after creating it and attach
     listeners to it for scrolling the table */
  
  const {tableContainer, columnContainer} = createTableStructure();

  this.node = tableContainer;

  // listener for both vertiacal and horizontal scrolling
  this.node.addEventListener('wheel', (e) => {
    e.preventDefault();

    if (!e.shiftKey) {
      // vertical scrolling

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
    } else {
      // horizontal scrolling

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

      performHorizontalScroll(scrollCount * 0.01);
    }
  });

  // store this reference to the column container that
  // was created above in createContainer for use in various places
  this._props.columnContainer = columnContainer;

  /* sorting properties */

  this.currentSortProperty = null;
  this.currentSortDirection = null;

  /*  column resizing properties */
  
  this._props.isResizing = false;
  
  /* scrolling properties */
  
  this.offset = 0;
  this._props.rowCount = 20;

  this._props.horizontalScrollOffset = 0;

  if (this._props.showVerticalScrollBar) {
    this._props.scrollBarContainer =
      this.node.getElementsByClassName('big-table-vertical-scroll-bar-container')[0];

    createScrollBar();
  }

  if (this._props.showHorizontalScrollBar) {
    this._props.horizontalScrollBarContainer =
      this.node.getElementsByClassName('big-table-horizontal-scroll-bar-container')[0];

    // creating the horizontal scroll relies on the columns existing
    // so we have to wait until after the table gets drawn
    setTimeout(() => {
      createHorizontalScrollBar();
    }, 0);
  }

  /* apply theme settings */

  const themeStyles = document.createElement('style');
  themeStyles.innerHTML = Themes[this._props.themeName];

  if (document.head.children.length) {
    document.head.insertBefore(themeStyles, document.head.children[0]);
  } else {
    document.head.appendChild(themeStyles);  
  }

  /* apply required styling for functionality */
  
  const requiredStyles = document.createElement('style');
  requiredStyles.innerHTML = requiredStylesContent;
  document.head.appendChild(requiredStyles);

  requiredStyles

  /* enable column resizing */

  if (this._props.enableColumnResizing) {
    const resetResizeProperties = () => {
      this._props.resizing = false;
      this._props.previousResizeX = null;
      this._props.resizeColumn = null;
    };

    resetResizeProperties();

    window.addEventListener('mousemove', (e) => {
      if (!this._props.resizing) return;

      const change = e.clientX - this._props.previousResizeX;

      const columnContainer = this._props.resizeColumn.parentNode;
      const columnDiv = this._props.resizeColumn;
      const columnContainerWidth = columnContainer.getBoundingClientRect().width;
      const columnWidth = columnDiv.getBoundingClientRect().width;
      const newColumnPercentage = (columnWidth + change) / columnContainerWidth;

      const columnIndex = Array.from(columnContainer.children)
        .indexOf(columnDiv);
      
      updateColumnGridTemplate(columnIndex, `${newColumnPercentage*100}%`);

      this._props.previousResizeX = e.clientX;

      updateHorizontalScrollHead();
    });

    window.addEventListener('mouseup', () => {
      resetResizeProperties();
    });
  }

  /* enable moveable columns */

  if (this._props.enableMoveableColumns) {
    // this tracks when the last header movement was, and is used to prevent
    // sorts happens by accident after a column move if a click listener is
    // attached to the header that was being moved
    this._props.previousDragTime = null;

    const resetColumnMoveProperties =() => {
      // put the drag header back in place
      if (this._props.currentDragColumnHeader) {
        this._props.currentDragColumnHeader.style.left = null;
        this._props.currentDragColumnHeader.style.top = null;
        this._props.currentDragColumnHeader.style.zIndex = null;
        this._props.currentDragColumnHeader.style.opacity = null;
      }

      this._props.isDraggingColumn = false;
      this._props.currentDragColumnHeader = null;
      this._props.columnDragXStart = null;
      this._props.columnDragYStart = null;
    };

    const resetOpacityForColumn = function() {
      this.style.opacity = null;
      this.removeEventListener('mouseout', resetOpacityForColumn);
    };

    // takes a target from a mouse move event during a column drag and
    // goes up it's parent tree to find the column node
    const findColumnFromEvent = (e) => {
      let eventTarget = e.target;

      // break out if the event target isn't a body child (this happens if the
      // mouse goes offscreen during a drag)
      const targetTagName = eventTarget.tagName.toUpperCase();
      if (['HTML', 'BODY'].includes(targetTagName)) return null;

      if (eventTarget === this._props.currentDragColumnHeader) {
        // if the mouse is currently over the header row, then due to the
        // z-index of the drag header during a drag, the event target will be 
        // the drag header every time. In this case, we need to figure out if a 
        // column node is underneath it

        const columnNodes = getColumnNodes();

        // because we're on the header row, our "mouseout" event removers won't
        // work (because the drag header steals the event), so we have to run
        //  the reset on all the columns just in case they were highlighted
        columnNodes.forEach((columnNode) => {
          columnNode.style.opacity = null;
        });
        
        // attempt to find a column underneath the event location
        columnNodes.some((columnNode) => {
          const columnRect = columnNode.getBoundingClientRect();

          if (!(e.clientX > columnRect.left)) return;
          if (!(e.clientX < columnRect.right)) return;
          if (!(e.clientY > columnRect.top)) return;
          if (!(e.clientY < columnRect.bottom)) return;

          // if we got past the if statements, the event happened over top of
          // the current column node in the loop

          eventTarget = columnNode;

          return true;
        });

        // if we didn't find a column node (and thus the eventTarget is never
        // changed from currentDragColumnHeader), return null
        if (eventTarget === this._props.currentDragColumnHeader) {
          return null;
        }
      } else {
        // if the mouse is not over the header row, the just check the parent
        // tree for a column node

        while (!eventTarget.classList.contains('big-table-column')) {
          eventTarget = eventTarget.parentNode;
  
          // if we ever reach the end of the parent tree, return the function
          if (eventTarget === document.body) return null;

        }
      }

      // this will either be a column node, or null
      return eventTarget;
    };

    const determineReleaseSide = (eventClientX, targetColumn) => {
      const columnRect = targetColumn.getBoundingClientRect();

      const columnClientMiddle = columnRect.left + (columnRect.width / 2);

      return eventClientX < columnClientMiddle ? 'left' : 'right';
    };

    // initialize the properties
    resetColumnMoveProperties();

    window.addEventListener('mousemove', (e) => {
      if (!this._props.isDraggingColumn) return;

      // perform the header move

      const newLeft = e.clientX - this._props.columnDragXStart;
      this._props.currentDragColumnHeader.style.left = `${newLeft}px`;

      this._props.currentDragColumnHeader.style.zIndex = 1;

      // alter the opacity of the target column

      const targetColumn = findColumnFromEvent(e);
      
      // set the target column's opacity if it hasn't already been set
      if (targetColumn) {
        if (!targetColumn.style.opacity) {
          targetColumn.style.opacity = 0.5;
          targetColumn.addEventListener('mouseout', resetOpacityForColumn);
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this._props.isDraggingColumn) return;

      const targetColumn = findColumnFromEvent(e);

      // if not releasing onto a column, cancel the drag
      if (targetColumn === null) {
        resetColumnMoveProperties();
        return;
      }

      const mouseReleaseSideOfColumn = determineReleaseSide(
        e.clientX, targetColumn
      );

      const dragColumn = this._props.currentDragColumnHeader.parentNode;

      const columnNodes = getColumnNodes();
      const targetColumnIndex = columnNodes.indexOf(targetColumn);
      const dragColumnIndex = columnNodes.indexOf(dragColumn);

      // determine what the new index of the column to place will be
      // based on where the mouse release happened on the target column
      // and which side of the drag column the target column is on
      const columnToInsertBefore = (() => {
        if (targetColumnIndex === dragColumnIndex) {
          // if both indexes are the same (the column is behing dropped on 
          // itself), a move is not necessary
          return undefined;
        } else if (targetColumnIndex < dragColumnIndex) {
          if (mouseReleaseSideOfColumn === 'left') {
            return targetColumn;
          } else if (mouseReleaseSideOfColumn === 'right') {
            return targetColumn.nextElementSibling;
          }
        } else {
          if (mouseReleaseSideOfColumn === 'left') {
            return targetColumn;
          } else if (mouseReleaseSideOfColumn === 'right') {
            return targetColumn.nextElementSibling;
          }
        }
      })();

      // a move is only required if we've determined we aren't trying to insert
      // the drag column before itself
      if (columnToInsertBefore !== dragColumn && columnToInsertBefore !== undefined) {
        
        dragColumn.remove();
        
        // columnToInsertBefore will be undefined if trying to place
        // the drag column at the end
        if (columnToInsertBefore === null) {
          this._props.columnContainer.appendChild(dragColumn);
        } else {
          this._props.columnContainer.insertBefore(
            dragColumn, columnToInsertBefore
          );
        }
        
        // here, i'm taking the old grid template as an array, and moving the 
        // drag columns template value to it's new location and updating the
        // grid template

        const columnContainerGridTemplate = getColumnContainerGridTemplateArray();

        const dragColumnTemplateValue = 
          columnContainerGridTemplate.splice(dragColumnIndex, 1);
        
        const newDragColumnIndex = getColumnNodes().indexOf(dragColumn);

        columnContainerGridTemplate.splice(
          newDragColumnIndex,
          0,
          dragColumnTemplateValue
        );

        const newGridTemplate = columnContainerGridTemplate.join(' ');

        this._props.columnContainer.style.gridTemplateColumns = newGridTemplate;

        this._props.previousDragTime = performance.now();
      }

      resetColumnMoveProperties();
    });
  }

  /* sorting algorithm optimizer */

  if (this._props.optimizeSorting) {
    const fastestBenchmarkMap = {};

    this.itemProperties.forEach((propertyName) => {
      // create an object for this property that will hold results for each
      // algorithm benchmark
      fastestBenchmarkMap[propertyName] = {};

      // test each property with each sorting algorithm and log benchmark results
      Sorting.algorithms.forEach((algorithmName) => {
        const benchmarkStart = performance.now();
        this.sort({propertyName, algorithm: algorithmName});
        const benchmarkEnd = performance.now();
        const elapsedTime = benchmarkEnd - benchmarkStart;

        // determine if this algorithm was faster than the current fastest
        // algorithm for this property
        const isFaster = (() => {
          if (fastestBenchmarkMap[propertyName].algorithmName !== undefined) {
            return fastestBenchmarkMap[propertyName].elapsedTime > elapsedTime;
          } else {
            return true;
          }
        })();

        // update the algorithm for this property if there isn't one or this
        // one was faster
        if (isFaster) {
          fastestBenchmarkMap[propertyName].elapsedTime = elapsedTime;
          fastestBenchmarkMap[propertyName].algorithmName = algorithmName;
        }

        this.clearSort();
      });
    });

    this._props.fastestBenchmarkMap = fastestBenchmarkMap;
  }
}