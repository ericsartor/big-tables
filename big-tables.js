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
  }
};
class BigTable {
  constructor(itemList, options) {
    /* set properties bsaed on user input */

    this.options = options;
    this.objects = itemList;
    this.containerClass = options.containerClass || null;
    this.columnClass = options.columnClass || null;
    this.cellClass = options.cellClass || null;

    this.propertyMode = options.propertyMode || 'mutual';

    // create the property list depending on the property mode
    if (!Array.isArray(this.propertyMode)) {
      switch (this.propertyMode) {
        case 'all':
          this.properties = this.findAllProperties(this.objects);
          break;
        case 'mutual':
          this.properties = this.findMutualProperties(this.objects);
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

    // create scroll bar if required
    if (options.scrollBar) {
      this.createScrollBar();
    }
  }

  createContainer() {
    const container = document.createElement('div');
    container.className = `big-table-container ${this.containerClass || ''}`;
    container.style.display = 'grid';
    container.style.gridTemplate = `1fr / ${this.gridTemplate.join(' ')}${this.options.scrollBar ? ` 30px` : ''}`;

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

      this.performScroll(scrollCount);
    });

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
    if (this.options.scrollBar) {
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

  hideColumn(columnNameOrIndex) {
    const columnName = Utils.isString(columnNameOrIndex) ? columnNameOrIndex
      : this.properties[Number(columnNameOrIndex)];

    const columnValueCells = this.node.querySelectorAll(`${columnName}-value-cell`);

    columnValueCells.forEach((valueCell) => {
      valueCell.style.display = 'none';
    });
  }

  /* SCROLLING STUFF */

  // returns the maximum the table offset can be without showing blank space
  determineMaxOffset() {
    return this.objects.length - this.rowCount;
  }

  determineMaxScrollBarTop() {
    return 100 - parseFloat(this.scrollBarHead.style.height);;
  }

  determineScrollBarScalingAmount() {
    let amount = 100;

    if (this.objects.length <= this.rowCount) return amount;

    const excessRows = this.objects.length - this.rowCount;

    let subtractAmount = 1;
    for (let i = 0; i < excessRows; i++) {
      amount -= subtractAmount;

      if (amount <= 20) return amount;

      subtractAmount *= 0.99;
    }

    return amount;
  }

  createScrollBar() {
    const scrollBarContainer = document.createElement('div');
    scrollBarContainer.className = 'big-table-scroll-bar-container';
    this.scrollBarContainer = scrollBarContainer;

    const scrollBarHead = document.createElement('div');
    scrollBarHead.className = 'big-table-scroll-bar-head';
    scrollBarHead.style.height = this.determineScrollBarScalingAmount() + '%';
    this.scrollBarHead = scrollBarHead;

    const that = this;
    scrollBarHead.addEventListener('mousedown', (e) => {
      that.grabbingScrollBar = true;
      that.scrollBarGrabPreviousY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      that.grabbingScrollBar = false;
      that.scrollBarGrabPreviousY = null;
    });

    window.addEventListener('mousemove', (e) => {
      if (!that.grabbingScrollBar) return;

      const containerRect = this.scrollBarContainer.getBoundingClientRect();

      if (e.clientY < containerRect.top) {
        this.performScroll(-this.offset);
      } else if (e.clientY > containerRect.bottom) {
        this.performScroll(this.determineMaxOffset() - this.offset);
      } else {
        const totalPixelsOfMovement = this.determineMaxScrollBarTop() / 100 * containerRect.height;
        const rowsPerPixel = this.objects.length / totalPixelsOfMovement;
        const moveAmountPixels = e.clientY - that.scrollBarGrabPreviousY;
        const totalRowsMoved = rowsPerPixel * moveAmountPixels;
  
        
        this.performScroll(Math.round(totalRowsMoved));
      }

      that.scrollBarGrabPreviousY = e.clientY;
      this.updateScrollHead();
    })

    scrollBarContainer.appendChild(scrollBarHead);
    this.node.appendChild(scrollBarContainer);
  }

  updateScrollHead() {
    const maximumTop = this.determineMaxScrollBarTop();
    const maxOffset = this.determineMaxOffset();
    const newTop = (this.offset / maxOffset) * maximumTop;
    this.scrollBarHead.style.top = newTop + '%';
  }

  // updates the table offset then re-draws table
  performScroll(steps) {
    const desiredOffset = this.offset + steps;
    const notTooHigh = desiredOffset <= this.determineMaxOffset();
    
    if (notTooHigh && desiredOffset >= 0) {
      this.offset = desiredOffset;
    } else {
      return;
    }

    this.updateScrollHead();
    this.draw();
  }

  /* UTILITIES */

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
  }

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
return function(itemList, options) {
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

  // if propertyMode is an array, make sure it only contains strings
  if (Array.isArray(options.propertyMode)) {
    options.propertyMode.forEach((propertyName) => {
      if (!Utils.isString(propertyName)) {
        throw Utils.generateError(`Explicit property names were passed in as the ` +
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
        throw Utils.generateError(`Column widths can only be numbers or fr values, ` +
          `but the value ${valueMatch} was found in the array.`);
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
  
  if (options.cellClass) {
    if (!Utils.isString(options.cellClass)) {
      throw Utils.generateError(`The cell class provided was not a string value: ${options.cellClass}`);
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

  
}})();