import test from "ava";
import * as grid from "../../lib/grid.js";

function getRandomInteger(max = 10) {
  return Math.trunc(Math.random() * max + 1);
}

test("able to create a grid", (t) => {
  const rows = getRandomInteger();
  const columns = getRandomInteger();
  const g = grid.create(rows, columns);

  // Should be rows x columns and full of nulls.
  t.is(g.length, rows);
  for (let row = 0; row < rows; row++) {
    t.is(g[row].length, columns);
    for (let column = 0; column < columns; column++) {
      t.is(g[row][column], null);
    }
  }
});

test("able to test that space is within the grid", (t) => {
  const rows = getRandomInteger();
  const columns = getRandomInteger();

  // Ensure all possible valid spaces.
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      t.true(grid.isInside(rows, columns, { row, column }));
    }
  }

  t.false(grid.isInside(rows, columns, { row: -1, column: 0 }));
  t.false(grid.isInside(rows, columns, { row: 0, column: -1 }));
  t.false(grid.isInside(rows, columns, { row: -1, column: -1 }));
  t.false(grid.isInside(rows, columns, { row: rows, column: 0 }));
  t.false(grid.isInside(rows, columns, { row: 0, column: columns }));
  t.false(grid.isInside(rows, columns, { row: rows, column: columns }));
});

test("able to test for equivalent spaces", (t) => {
  const row = getRandomInteger();
  const column = getRandomInteger();

  // Ensure the obvious.
  t.true(grid.isSameSpace({ row, column }, { row, column }));
  t.false(grid.isSameSpace({ row: 1, column: 0 }, { row: 0, column: 0 }));
  t.false(grid.isSameSpace({ row: 0, column: 1 }, { row: 0, column: 0 }));
  t.false(grid.isSameSpace({ row: 1, column: 1 }, { row: 0, column: 0 }));
  t.false(grid.isSameSpace({ row: 0, column: 0 }, { row: 1, column: 0 }));
  t.false(grid.isSameSpace({ row: 0, column: 0 }, { row: 0, column: 1 }));
  t.false(grid.isSameSpace({ row: 0, column: 0 }, { row: 1, column: 1 }));

  // Still works with extra data.
  t.true(
    grid.isSameSpace({ row, column, foo: true }, { row, column, bar: false })
  );
});

test("able to set grid values", (t) => {
  const rows = getRandomInteger();
  const columns = getRandomInteger();
  const g = grid.create(rows, columns);
  const row = getRandomInteger(rows) - 1;
  const column = getRandomInteger(columns) - 1;
  const value = "foo";
  grid.setValue(g, { row, column }, value);
  t.is(g[row][column], value);
});

test("able to get grid values", (t) => {
  const rows = getRandomInteger();
  const columns = getRandomInteger();
  const g = grid.create(rows, columns);
  const row = getRandomInteger(rows) - 1;
  const column = getRandomInteger(columns) - 1;
  const value = "foo";
  g[row][column] = value;
  t.is(grid.getValue(g, { row, column }), value);
});

test("able to get every space in a grid", (t) => {
  const rows = getRandomInteger();
  const columns = getRandomInteger();
  const g = grid.create(rows, columns);

  const value = "foo";

  for (const space of grid.getSpaces(rows, columns)) {
    // Should not be outside the bounds of the grid.
    const { row, column } = space;
    t.false(row < 0 || row > rows - 1);
    t.false(column < 0 || column > columns - 1);
    // Set a value to check later.
    grid.setValue(g, space, value);
  }

  // Ensure every value was set.
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      t.is(g[row][column], value);
    }
  }
});

test("able to add two spaces", (t) => {
  const row = getRandomInteger();
  const column = getRandomInteger();
  const space = grid.addSpace({ row, column }, { row, column });
  t.is(space.row, row * 2);
  t.is(space.column, column * 2);
});

test("able to move value from one space to another", (t) => {
  const rows = 10;
  const columns = 10;
  const g = grid.create(rows, columns);

  // Use an object to ensure it's the same instance.
  const value = { foo: true };

  // Get a random source space.
  const from = {
    row: getRandomInteger(rows),
    column: getRandomInteger(columns),
  };

  grid.setValue(g, from, value);

  // Ensure the destination is not the same space.
  let to;
  do {
    to = {
      row: getRandomInteger(rows),
      column: getRandomInteger(columns),
    };
  } while (grid.isSameSpace(from, to));

  const moved = grid.moveValue(g, from, to);

  t.is(value, moved);
  t.is(grid.getValue(g, to), value);
  t.is(grid.getValue(g, from), null);
});
