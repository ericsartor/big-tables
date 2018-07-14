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