export const direction = {
  north: { row: -1, column: 0 },
  south: { row: 1, column: 0 },
  east: { row: 0, column: 1 },
  west: { row: 0, column: -1 },
  northeast: { row: -1, column: 1 },
  northwest: { row: -1, column: -1 },
  southeast: { row: 1, column: 1 },
  southwest: { row: 1, column: -1 },
};

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

export function addSpace(space1, space2) {
  return {
    row: space1.row + space2.row,
    column: space1.column + space2.column,
  };
}

export function getDistance(from, to) {
  return {
    row: to.row - from.row,
    column: to.column - from.column,
  };
}

export function getDirection(from, to) {
  const { row, column } = getDistance(from, to);
  return {
    row: row == 0 ? 0 : row / Math.abs(row),
    column: column == 0 ? 0 : column / Math.abs(column),
  };
}

export function invertSpace(space) {
  return {
    row: -space.row,
    column: -space.column,
  };
}

export function moveValue(grid, from, to) {
  const value = getValue(grid, from);
  setValue(grid, to, value);
  setValue(grid, from, null);
  return value;
}

export function setValue(grid, space, value) {
  const { row, column } = space;
  grid[row][column] = value;
}

export function getValue(grid, space) {
  const { row, column } = space;
  return grid[row][column];
}
