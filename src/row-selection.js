// this will keep track of which "rows" (objects) are selected
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

// this gets called on a click event for a value cell
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