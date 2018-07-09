const Themes = {
  'btdefault': `
    .big-table-container {
      overflow:hidden;
    }
    
    .big-table-vertical-scroll-bar-track {
      position:relative;
      grid-column:-2;
      grid-row:1;
    }
    .big-table-vertical-scroll-bar-head {
      position:relative;
      width:80%;
      margin-left:10%;
    }

    .big-table-horizontal-scroll-bar-track {
      position:relative;
    }
    .big-table-horizontal-scroll-bar-head {
      position:relative;
      height:26px;
      margin-top:2px;
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
    .big-table-value-cell.big-table-enable-highlight {
      user-select:initial;
    }
    .big-table-value-cell.big-table-selected {
      background:blue !important;
    }
  `
};