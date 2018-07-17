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