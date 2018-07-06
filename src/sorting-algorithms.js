const Sorting = {
  compare(a, b, comparison, sortHierarchy, direction) {
    let columnIndex = 0;

    const isSortAscending = direction === 'asc';
  
    if (comparison === 'less') {
      while (columnIndex < sortHierarchy.length) {
        let aValue = a[sortHierarchy[columnIndex]];
        let bValue = b[sortHierarchy[columnIndex]];
        columnIndex++;
        
        // skip identical values because they're not less than or greater than...
        if (aValue === bValue) continue;

        // handle if either value is undefined
        if (aValue === undefined) return true;
        if (bValue === undefined) return false;
    
        let aAsNumber = Number(aValue);
        let bAsNumber = Number(bValue);
    
        aValue = isNaN(aAsNumber) ? aValue : aAsNumber;
        bValue = isNaN(aAsNumber) ? bValue : bAsNumber;
    
        return (aValue < bValue) && isSortAscending
          || (aValue > bValue) && !isSortAscending;
      }

      // if the while loop doesn't return, then the objects are equal
      return false;
    } else if (comparison === 'greater') {
      while (columnIndex < sortHierarchy.length) {
        let aValue = a[sortHierarchy[columnIndex]];
        let bValue = b[sortHierarchy[columnIndex]];
        columnIndex++;
        
        // skip identical values because they're not less than or greater than...
        if (aValue === bValue) continue;
    
        let aAsNumber = Number(aValue);
        let bAsNumber = Number(bValue);
    
        aValue = isNaN(aAsNumber) ? aValue : aAsNumber;
        bValue = isNaN(aAsNumber) ? bValue : bAsNumber;
    
        return (aValue > bValue) && isSortAscending
          || (aValue < bValue) && !isSortAscending;
      }

      // if the while loop doesn't return, then the objects are equal
      return false;
    } else {
      throw Utils.generateError(`Sort compare type was neither less or greater.`);
    }
  },

  algorithms: ['btsort', 'quicksort'],

  btsort(arr, sortHierarchy, direction) {
    const sortHierarchyCopy = [].concat(sortHierarchy);

    // creates a multi-dimensional ray as deep as the sort hierarchy where
    // the fundamental objects are in the desired sort order
    const sortedObjsArr = (function sortListForProp(arr, prop) {
      /*
        let map = {
          'value1': [arr of objs...],
          'value2': [arr of objs...],
          'value3': [arr of objs...],
          ...
        }
      */
     // sort the objects into arrays of identical values for current property
      let map = {};
      arr.forEach((obj) => {
        const objValue = (() => {
          if (obj[prop]) {
            return obj[prop].ToString ? obj[prop].ToString() : obj[prop];
          } else {
            return '0';
          }
        })();        
        
        if (map[objValue]) {
          map[objValue].push(obj);
        } else {
          map[objValue] = [obj];
        }
      });
    
      // if there is a next property in the hierarchy, take the current map
      // values (arrays of objects) and create a sorted map for it and return
      // an array of the resulting values
      if (sortHierarchyCopy.length) {
        const nextProp = sortHierarchyCopy.shift();
        for (const valueKey in map) {
          map[valueKey] = sortListForProp(map[valueKey], nextProp);
        }
        sortHierarchyCopy.unshift(nextProp);
      }
    
      // take the current map values and put them in an array in the sorted
      // order of their keys
      let orderedGroups = Object.keys(map)
      .sort((a, b) => {
        const aAsNumber = Number(a);
        const bAsNumber = Number(b);

        a = isNaN(aAsNumber) ? a : aAsNumber;
        b = isNaN(bAsNumber) ? b : bAsNumber;

        if (a < b) return direction === 'asc' ? -1 : 1;
        else if (a > b) return direction === 'asc' ? 1 : -1;
        else return 0;
      })
      .map((valueKey) => {
        return map[valueKey];
      });
    
      return orderedGroups;
    })(arr, sortHierarchyCopy.shift());

    // take the completed sort array and reduce it to a one dimensional array
    const sortedObjs = [];
    (function readArray(arr) {
      arr.forEach((item) => {
        if (Array.isArray(item)) {
          readArray(item);
        } else {
          sortedObjs.push(item);
        }
      });
    })(sortedObjsArr);

    return sortedObjs;
  },

  quicksort(arr, sortHierarchy, direction) {
    return (function quicksort(arr, left, right, sortHierarchy, direction) {
      if (left >= right) {
        return;
      }

      const pivot = right;
      let wall = left;
      let pivotValue = arr[pivot];

      for (let i = left; i <= right; i++) {
        if (i !== pivot) {
          if (Sorting.compare(arr[i], pivotValue, 'less', sortHierarchy, direction)) {
            // current value is less than pivot, move it next to wall and increase wall
            let rightOfWallValue = arr[wall];
            arr[wall] = arr[i];
            arr[i] = rightOfWallValue;
            wall++
          }
        }
      }

      // swap the pivot with the item to the right of the wall
      arr[pivot] = arr[wall];
      arr[wall] = pivotValue;

      quicksort(arr, left, wall - 1, sortHierarchy, direction);
      quicksort(arr, wall + 1, right, sortHierarchy, direction);

      return arr;
    })(arr, 0, arr.length - 1, sortHierarchy, direction);
  }
};