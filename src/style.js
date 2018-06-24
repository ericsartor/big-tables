const style = document.createElement('style');
  style.innerHTML = `
  .big-table-scroll-bar-container {
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