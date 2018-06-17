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

  // scrolling stuff

  determineMaxOffset() {
    return this.objects.length - this.rowCount;
  }

  createScrollBar() {
    const scrollBarContainer = document.createElement('div');
    scrollBarContainer.className = 'big-table-scroll-bar-container';

    const scrollBarHead = document.createElement('div');
    scrollBarHead.className = 'big-table-scroll-bar-head';

    scrollBarContainer.appendChild(scrollBarHead);
    this.node.appendChild(scrollBarContainer);
  }

  performScroll(steps) {
    const desiredOffset = this.offset + steps;
    const notTooHigh = desiredOffset < this.determineMaxOffset();
    
    if (notTooHigh && desiredOffset >= 0) {
      this.offset = desiredOffset;
    } else {
      return;
    }

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