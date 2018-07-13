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