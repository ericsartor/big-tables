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