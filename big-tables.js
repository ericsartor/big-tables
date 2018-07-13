const BigTable = (function() {
  const Themes = {
    'btdefault': ``
  };
  
  const requiredStylesContent = `
    .big-table-container {
      overflow:hidden;
    }
  
    .big-table-vertical-scroll-bar-track {
      position:relative;
    }
    .big-table-vertical-scroll-bar-head {
      position:relative;
    }
  
    .big-table-horizontal-scroll-bar-track {
      position:relative;
    }
    .big-table-horizontal-scroll-bar-head {
      position:relative;
    }
  
    .big-table-header {
      user-select:none;
      overflow:hidden;
      white-space:nowrap;
      position:relative;
    }
  
    .big-table-value-cell {
      user-select:none;
      overflow:hidden;
      white-space:nowrap;
    }
    .big-table-value-cell.big-table-enable-highlight {
      user-select:initial;
    }
    .big-table-value-cell.big-table-selected {
      background:blue !important;
    }
  `;

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

  const Sorting = {
    compare(a, b, comparison, sortHierarchy, direction) {
      let columnIndex = 0;
  
      const isSortAscending = direction === 'asc';
    
      if (comparison === 'less') {
        while (columnIndex < sortHierarchy.length) {
          let aValue = a[sortHierarchy[columnIndex]];
          let bValue = b[sortHierarchy[columnIndex]];
          columnIndex++;
          
          // skip identical values because they're not less than or greater than...
          if (aValue === bValue) continue;
  
          // handle if either value is undefined
          if (aValue === undefined) return true;
          if (bValue === undefined) return false;
      
          let aAsNumber = Number(aValue);
          let bAsNumber = Number(bValue);
      
          aValue = isNaN(aAsNumber) ? aValue : aAsNumber;
          bValue = isNaN(aAsNumber) ? bValue : bAsNumber;
      
          return (aValue < bValue) && isSortAscending
            || (aValue > bValue) && !isSortAscending;
        }
  
        // if the while loop doesn't return, then the objects are equal
        return false;
      } else if (comparison === 'greater') {
        while (columnIndex < sortHierarchy.length) {
          let aValue = a[sortHierarchy[columnIndex]];
          let bValue = b[sortHierarchy[columnIndex]];
          columnIndex++;
          
          // skip identical values because they're not less than or greater than...
          if (aValue === bValue) continue;
      
          let aAsNumber = Number(aValue);
          let bAsNumber = Number(bValue);
      
          aValue = isNaN(aAsNumber) ? aValue : aAsNumber;
          bValue = isNaN(aAsNumber) ? bValue : bAsNumber;
      
          return (aValue > bValue) && isSortAscending
            || (aValue < bValue) && !isSortAscending;
        }
  
        // if the while loop doesn't return, then the objects are equal
        return false;
      } else {
        throw Utils.generateError(`Sort compare type was neither less or greater.`);
      }
    },
  
    algorithms: ['btsort', 'javascript'],
  
    btsort(arr, sortHierarchy, direction) {
      const sortHierarchyCopy = [].concat(sortHierarchy);
  
      // creates a multi-dimensional ray as deep as the sort hierarchy where
      // the fundamental objects are in the desired sort order
      const sortedObjsArr = (function sortListForProp(arr, prop) {
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
        arr.forEach((obj) => {
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
        if (sortHierarchyCopy.length) {
          const nextProp = sortHierarchyCopy.shift();
          for (const valueKey in map) {
            map[valueKey] = sortListForProp(map[valueKey], nextProp);
          }
          sortHierarchyCopy.unshift(nextProp);
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
      })(arr, sortHierarchyCopy.shift());
  
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
  
      return sortedObjs;
    },
  
    javascript(arr, sortHierarchy, direction) {
      return arr.sort((a, b) => {
        return Sorting.compare(a, b, 'less', sortHierarchy, direction) ? 1 : -1;
      });
    }
  };

  function BigTable(itemList, options) {
    /* PRIVATE CONSTANTS */
  
    // this is the value printed to a value cell when a property doesn't exist
    // on the object being drawn
    const NO_VALUE = '[no value]';
  
    /* PRIVATE METHODS */
  
    // creates the main container, the column container and (if enabled by user)
    // the scroll bar containers for vertical and horizontal scroll bars
    const createTableStructure = () => {
      // whole table container
      const tableContainer = document.createElement('div');
      tableContainer.className = `big-table-container` +
        ` ${this._props.containerClass || ''}`;
      tableContainer.style.display = 'grid';
      tableContainer.style.gridTemplate = `1fr` +
        `${this._props.showHorizontalScrollBar ? ` 30px` : ''}` +
        ` / 1fr` +
        `${this._props.showVerticalScrollBar ? ` 30px` : ''}`;
  
      // container for column nodes
      const columnContainer = document.createElement('div');
      columnContainer.className = `big-table-column-container`;
      columnContainer.style.display = 'grid';
      columnContainer.style.gridTemplate = `1fr / ` +
        `${this._props.gridTemplate.join(' ')}`;
      columnContainer.style.position = 'relative';
  
      tableContainer.appendChild(columnContainer);
      
      if (this._props.showVerticalScrollBar) {
        // container for the vertical scroll bar
        const scrollBarContainer = document.createElement('div');
        scrollBarContainer.className = `big-table-vertical-scroll-bar-container`;
        scrollBarContainer.style.display = 'grid';
        scrollBarContainer.style.gridTemplate = `1fr / 1fr`;
        tableContainer.appendChild(scrollBarContainer);
      }
  
      if (this._props.showHorizontalScrollBar) {
        // container for the horizontal scroll bar
        const scrollBarContainer = document.createElement('div');
        scrollBarContainer.className = `big-table-horizontal-scroll-bar-container`;
        scrollBarContainer.style.display = 'grid';
        scrollBarContainer.style.gridTemplate = `1fr / 1fr`;
        tableContainer.appendChild(scrollBarContainer);
      }
  
      return {
        tableContainer,
        columnContainer
      };
    };
  
    // create the vertical column that will hold the value cells for a given
    // item property and the column header cell
    const createColumn = () => {
      const columnDiv = document.createElement('div');
      columnDiv.className = `big-table-column ${this._props.columnClass || ''}`;
  
      return columnDiv;
    };
  
    // create the first cell of each column that acts as the header or title for
    // that column, which has listeners attached to it for resizing the columns
    // and moving the columns
    const createHeader = (headerName) => {
      const headerDiv = document.createElement('div');
      headerDiv.className = `big-table-header ${this._props.headerClass || ''}`;
      headerDiv.textContent = headerName;
      headerDiv.style.display = 'grid';
  
      if (this._props.enableColumnResizing || this._props.enableMoveableColumns) {
        // returns false if mouse is not in a resize hitbox, or
        // 'left'/'right' if it is (signifying which side of the header).
        // this method is used in both column resizing and column moving logic,
        // so it is included in this main lexical scope
        const isMouseInResizeHitbox = (headerDiv, clientX) => {
          const headerRect = headerDiv.getBoundingClientRect();
          const leftEdge = Math.floor(headerRect.left);
          const rightEdge = Math.ceil(headerRect.right);
  
          const columnDivs = getColumnNodes();
  
          const firstColumn = columnDivs[0];
  
          const hitboxWidth = 10;
  
          if (
            clientX >= leftEdge &&
            clientX < leftEdge + hitboxWidth / 2 &&
            headerDiv.parentNode !== firstColumn  
          ) {
            return 'left';
          } else if (
            clientX <= rightEdge &&
            clientX >= rightEdge - hitboxWidth / 2
          ) {
            return 'right';
          } else {
            return false;
          }
        };
        
        // add listeners for enabling column resizing
        if (this._props.enableColumnResizing) {
          // change the cursor to a resize cursor if inside a resize hitbox
          headerDiv.addEventListener('mousemove', (e) => {
            const whichResizeHitbox = isMouseInResizeHitbox(headerDiv, e.clientX);
  
            if (whichResizeHitbox && headerDiv.style.cursor !== 'col-resize') {
              headerDiv.style.cursor = 'col-resize';
            } else if (!whichResizeHitbox && headerDiv.style.cursor) {
              headerDiv.style.cursor = null;
            }
          });
  
          // reset the cursor to default if it was set to resize
          headerDiv.addEventListener('mouseout', () => {
            if (headerDiv.style.cursor) {
              headerDiv.style.cursor = null;
            }
          });
  
          // if user clicks on a resize hitbox, enable resizing and set the column
          // div to be resized
          headerDiv.addEventListener('mousedown', (e) => {
            const whichResizeHitbox = isMouseInResizeHitbox(headerDiv, e.clientX);
  
            if (!whichResizeHitbox) return;
  
            if (whichResizeHitbox === 'left') {
              // if grabbing the left hitbox, resize the element to the left
              this._props.resizeColumn = headerDiv.parentNode.previousElementSibling;
            } else if (whichResizeHitbox === 'right') {
              // if grabbing right hitbox, resize current element
              this._props.resizeColumn = headerDiv.parentNode;
            }
  
            this._props.resizing = true;
            this._props.previousResizeX = e.clientX;
          });
        }
  
        // add listeners for enabling column movement
        if (this._props.enableMoveableColumns) {
          headerDiv.addEventListener('mousedown', (e) => {
            // stops the header from being dragged if user is trying to resize
            if (
              this._props.enableColumnResizing &&
              isMouseInResizeHitbox(headerDiv, e.clientX)
            ) {
              return;
            }
  
            this._props.isDraggingColumn = true;
            this._props.currentDragColumnHeader = headerDiv;
  
            // track start of drag so we know where to move the header to
            // during each move
            this._props.columnDragXStart = e.clientX;
            this._props.columnDragYStart = e.clientY;
          });
        }
      }
  
      return headerDiv;
    };
  
    // create a cell that will be added to a column, displaying the value for
    // the property the column is for for the object being drawn 
    const createValueCell = (value, rowNumber, propertyName, rowObject) => {
      value = (() => {
        if (!this._props.valueParseFunctions) {
          return value;
        } else if (!this._props.valueParseFunctions[propertyName]) {
          return value;
        } else {
          return this._props.valueParseFunctions[propertyName](value);
        }
      })();
  
      const valueCellDiv = document.createElement('div');
      valueCellDiv.className = `big-table-value-cell big-table-row-${rowNumber}` +
        ` big-table-${propertyName}-value-cell ${this._props.cellClass || ''}` +
        ` ${isInSelection(rowObject) ? 'big-table-selected' : ''}`;
      valueCellDiv.textContent = value;
      valueCellDiv.rowObject = rowObject;
  
      const tableContainer = this.node;
  
      // enable text selecting for the column the hovered value cell is in or the
      // row the value cell is in based on if shift key is pressed down
      valueCellDiv.addEventListener('mouseover', function(e) {
        const allValueCells = Array.from(
          tableContainer.getElementsByClassName(`big-table-value-cell`)
        );
  
        const valueCellsToEnableHighlightOn = Array.from(
          e.shiftKey ?
          Array.from(
            // value cells in the same row as the hovered cell
            tableContainer.getElementsByClassName(`big-table-row-${rowNumber}`)
          ) :
          Array.from(
            // value cells in the same column as the hovered cell
            tableContainer.getElementsByClassName(`big-table-${propertyName}-value-cell`)
          )
        );
  
        const valueCellsToDisableHighlightOn = allValueCells.filter((valueCell) => {
          return !valueCellsToEnableHighlightOn.includes(valueCell);
        });
  
        valueCellsToEnableHighlightOn.forEach((cell) => {
          cell.classList.add('big-table-enable-highlight')
        });
  
        valueCellsToDisableHighlightOn.forEach((cell) => {
          cell.classList.remove('big-table-enable-highlight')
        });
      });
  
      // row selection listener
      valueCellDiv.addEventListener('click', function(e) {
        handleRowSelection(e, valueCellDiv.rowObject);
        draw();
      });
  
      return valueCellDiv;
    };
  
    /* row selection functions and variables */
  
    this.selectedItems = [];
  
    const clearSelection = () => {
      while (this.selectedItems.length !== 0) {
        this.selectedItems.pop();
      }
    };
  
    const removeFromSelection = (rowObject) => {
      const i = this.selectedItems[this.selectedItems.indexOf(rowObject)];
      this.selectedItems.splice(i, 1);
    };
  
    const addToSelection = (rowObject) => {
      this.selectedItems.push(rowObject);
    };
  
    const isInSelection = (rowObject) => {
      return this.selectedItems.includes(rowObject);
    };
  
    const handleRowSelection = (e, rowObject) => {
      if (this.selectedItems.length === 0) {
        addToSelection(rowObject);
      } else {
        if (e.ctrlKey) {
          if (isInSelection(rowObject)) {
            removeFromSelection();
          } else {
            addToSelection(rowObject);
          }
        } else if (e.shiftKey) {
          const currentList = getCurrentObjectList();
  
          const selectionStartIndex = currentList.indexOf(this.selectedItems[0]);
          const clickedIndex = currentList.indexOf(rowObject);
          const startingIndex = Math.min(clickedIndex, selectionStartIndex);
          const endingIndex = Math.max(clickedIndex, selectionStartIndex);
                  
          for (let i = startingIndex; i <= endingIndex; i++) {
            const item = currentList[i];
            if (!isInSelection(item)) {
              addToSelection(item);
            }
          }
        } else {
          clearSelection();
          addToSelection(rowObject);
        }
      }
    };
  
    // removes the row selection if anything that isn't a child of the table is
    // clicked
    window.addEventListener('click', (e) => {
      let childOfBigTable = false;
      e.target.className.split(' ').some((className) => {
        if (className.includes('big-table')) {
          childOfBigTable = true;
          return true;
        }
      });
  
      if (!childOfBigTable) {
        clearSelection();
        draw();
      }
    });
  
    /* value request functions */
  
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
  
    /* value update functions */
  
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
  
  
    /* SCROLLING STUFF */
  
    /* VERTICAL SCROLLING */
    
    // returns the maximum the table offset can be without showing blank space
    const determineMaxOffset = () => {
      return getCurrentObjectList().length - this._props.rowCount;
    };
    
    // returns the maximum "top" value in percentage that the scroll bar head
    // can be set to without going past the bottom of the scroll bar track
    // based on the head's current height (which is always in percentage)
    const determineMaxScrollBarTop = () => {
      return 100 - parseFloat(this._props.scrollBarHead.style.height);
    };
    
    // algorithm to determine how big to make the scroll bar head
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
    
    // visually update the scroll bar head based on the current offset
    const updateScrollHead = () => {
      const maximumTop = determineMaxScrollBarTop();
      const maxOffset = determineMaxOffset();
      const newTop = (this.offset / maxOffset) * maximumTop;
      this._props.scrollBarHead.style.top = newTop + '%';
    };
    
    // updates the table offset then re-draws table, firing the the btscroll event
    const performScroll = (steps) => {
      let desiredOffset = this.offset + steps;
      const maxOffset = determineMaxOffset();
      
      desiredOffset = desiredOffset < 0 ? 0 : desiredOffset;
      desiredOffset = desiredOffset > maxOffset ? maxOffset : desiredOffset
    
      this.offset = desiredOffset;
    
      if (this._props.showVerticalScrollBar) updateScrollHead();
    
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
    
    const createScrollBar = () => {
      const scrollBarTrack = document.createElement('div');
      scrollBarTrack.className = `big-table-vertical-scroll-bar-track ` +
        `${this._props.scrollBarTrackClass || ''}`;
    
      this._props.scrollBarTrack = scrollBarTrack;
    
      const scrollBarHead = document.createElement('div');
      scrollBarHead.style.height = determineScrollBarScalingAmount() + '%';
      scrollBarHead.className = `big-table-vertical-scroll-bar-head ` +
        `${this._props.scrollBarHeadClass || ''}`;
      
        this._props.scrollBarHead = scrollBarHead;
    
      const that = this;
    
      // listener for starting a scroll bar drag
      scrollBarHead.addEventListener('mousedown', (e) => {
        that._props.grabbingScrollBar = true;
        that._props.scrollBarGrabPreviousY = e.clientY;
      });
    
      // listener for ending a scroll bar drag
      window.addEventListener('mouseup', () => {
        that._props.grabbingScrollBar = false;
        that._props.scrollBarGrabPreviousY = null;
      });
    
      // listener for performing a scroll bar drag
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
  
    /* HORIZONTAL SCROLLING */
    
    // calculates the total pixel width of all columns
    const determineWidthOfAllColumns = () => {
      const columnNodes = getColumnNodes();
      const columnNodesLeftEdge = columnNodes[0].getBoundingClientRect().left;
      const columnNodesRightEdge = columnNodes[columnNodes.length - 1]
        .getBoundingClientRect().right;
      const widthOfAllColumns = columnNodesRightEdge - columnNodesLeftEdge;
      
      return widthOfAllColumns;
    };
    
    // calculates how big the scroll bar head should be based on how much wider
    // the columns are than the column container
    const determineHorizontalScrollBarHeadSize = () => {
      const widthOfAllColumns = determineWidthOfAllColumns();
      const widthOfColumnContainer = this._props.columnContainer
        .getBoundingClientRect().width;
    
      const scrollBarHeadWidth = widthOfColumnContainer / widthOfAllColumns * 100;
    
      return scrollBarHeadWidth > 100 ? 100 : scrollBarHeadWidth;
    };
    
    // calculates the maximum "left" value in percentage the scroll bar head can
    // be set to without going past the right side of the scroll bar track
    const determineMaxScrollBarLeft = () => {
      return 100 - determineHorizontalScrollBarHeadSize();
    };
    
    // visually update the scroll bar head based on the current offset
    const updateHorizontalScrollHead = () => {
      this._props.horizontalScrollBarHead.style.width =
        determineHorizontalScrollBarHeadSize() + '%';
    
      const maximumLeft = determineMaxScrollBarLeft();
      const newLeft = this._props.horizontalScrollOffset * maximumLeft;
      this._props.horizontalScrollBarHead.style.left = newLeft + '%';
    };
    
    // determines the new offset based on how many scroll "steps" are supplied
    // and moves the actual columns left or right, as well as updating the scroll
    // bar head if visible
    const performHorizontalScroll = (steps) => {
      // a "step" = 0.01 or 1% of the amount the scroll bar head can move
      let desiredOffset = this._props.horizontalScrollOffset + steps;
      
      // round to 0 / 1 if past 1% or 99%
      desiredOffset = desiredOffset < 0.01 ? 0 : desiredOffset;
      desiredOffset = desiredOffset > 0.99 ? 1 : desiredOffset;
    
      this._props.horizontalScrollOffset = desiredOffset;
    
      this._props.columnContainer.style.left = 
        -(this._props.horizontalScrollOffset * determineMaxScrollBarLeft()) + '%';
    
      if (this._props.showHorizontalScrollBar) updateHorizontalScrollHead();
    };
    
    const createHorizontalScrollBar = () => {
      const horizontalScrollBarTrack = document.createElement('div');
      horizontalScrollBarTrack.className = `big-table-horizontal-scroll-bar-track ` +
        `${this._props.horizontalScrollBarTrackClass || ''}`;
    
      this._props.horizontalScrollBarTrack = horizontalScrollBarTrack;
    
      const horizontalScrollBarHead = document.createElement('div');
      horizontalScrollBarHead.style.width = determineHorizontalScrollBarHeadSize() + '%';
      horizontalScrollBarHead.className = `big-table-horizontal-scroll-bar-head ` +
        `${this._props.horizontalScrollBarHeadClass || ''}`;
      
        this._props.horizontalScrollBarHead = horizontalScrollBarHead;
    
      const that = this;
    
      // listener for starting a scroll bar drag
      horizontalScrollBarHead.addEventListener('mousedown', (e) => {
        that._props.grabbingHorizontalScrollBar = true;
        that._props.horizontalScrollBarGrabPreviousX = e.clientX;
      });
    
      // listener for ending a scroll bar drag
      window.addEventListener('mouseup', () => {
        that._props.grabbingHorizontalScrollBar = false;
        that._props.horizontalScrollBarGrabPreviousX = null;
      });
    
      // listener for handling a scroll bar drag
      window.addEventListener('mousemove', (e) => {
        if (!that._props.grabbingHorizontalScrollBar) return;
    
        const trackRect = this._props.horizontalScrollBarTrack
          .getBoundingClientRect();
    
        if (e.clientX < trackRect.left) {
          performHorizontalScroll(-this._props.horizontalScrollOffset);
        } else if (e.clientX > trackRect.right) {
          performHorizontalScroll(1 - this._props.horizontalScrollOffset);
        } else {
          // the empty space in the scroll bar track not taken up by the head
          const totalPixelsOfMovement = determineMaxScrollBarLeft() / 100
            * trackRect.width;
    
          const moveAmountPixels = e.clientX -
            that._props.horizontalScrollBarGrabPreviousX;
          const moveAmountPercent = moveAmountPixels / totalPixelsOfMovement;
    
          performHorizontalScroll(moveAmountPercent);
        }
    
        that._props.horizontalScrollBarGrabPreviousX = e.clientX;
        updateHorizontalScrollHead();
      })
    
      horizontalScrollBarTrack.appendChild(horizontalScrollBarHead);
      this._props.horizontalScrollBarContainer.appendChild(horizontalScrollBarTrack);
    };
    
    console.log('it worked');
  
    /**********************************
    ** PUBLIC METHODS AND PROPERTIES **
    ***********************************/
  
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
      'verticalScrollBarTrackClass',
      'verticalScrollBarHeadClass',
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
    validatePropertyAsString('verticalScrollBarTrackClass');
    validatePropertyAsString('verticalScrollBarHeadClass');
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
})();