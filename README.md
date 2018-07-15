**NOTE**:  This utility has not officially released yet.  v1.0 is still under development.

The goal of BigTables is to allow you to display large amounts of data in a tabular structure without slowing your page down, as well as giving you numerous tools to make that data easier to view manage.

Traditional HTML tables will make your pages hang when the row count gets into the thousands, and BigTables solves that by only ever rendering as many rows as it can fit in it's container.

BigTables also gives you lots of other features that are desireable when dealing with large amounts of data so you can write less code and simply feed your data into a pre-made table:

- custom scrolling (data pagination) with toggleable scroll bar
- vertical and horizontal text hightling for copying text in rows or columns
- a filter API for allowing users to whittle down your data
- optimized sorting API with numerous algorithms
- sorting hierarchies for specifying how sorting should be done
- user-resizeable columns (toggleable)
- support for event handlers so your table can still react to the user however you want
- custom events:
    - btfilter
    - btsort
    - btitemsetchange
    - btclearfilter
    - btclearsort
    - btscroll (vertical only)
- complete customizeability via supplying CSS classes to be applied to parts of the table
- built in themes for getting up and running quickly