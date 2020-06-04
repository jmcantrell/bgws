export function create(rows, columns) {
  const grid = [];
  for (let row = 0; row < rows; row++) {
    grid.push([]);
    for (let column = 0; column < columns; column++) {
      grid[row].push(null);
    }
  }
  return grid;
}

export function* getSpaces(rows, columns) {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      yield { row, column };
    }
  }
}

export function isInside(rows, columns, space) {
  const { row, column } = space;
  return row >= 0 && row < rows && column >= 0 && column < columns;
}

export function isSameSpace(space1, space2) {
  return space1.row == space2.row && space1.column == space2.column;
}

export function setValue(grid, space, value) {
  const { row, column } = space;
  grid[row][column] = value;
}

export function getValue(grid, space) {
  const { row, column } = space;
  return grid[row][column];
}
