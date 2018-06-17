const style = document.createElement('style');
  style.innerHTML = `
  .big-table-scroll-bar-container {
    position:relative;
    grid-column:-2;
    grid-row:1;
    background:blue;
  }
  big-table-scroll-bar-head {
    position:absolute;
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