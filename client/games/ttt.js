import Game from "/game.js";

const ROWS = 3;
const COLUMNS = 3;

class TicTacToe extends Game {
  constructor() {
    super("ttt");
    this.addLayer("hints");
    this.addLayer("pieces");
    this.addLayer("board");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (!this.state || !this.state.turn) return;
      const space = this.getSpace(event.offsetX, event.offsetY);
      this.drawIndicator(space);
    });

    this.elements.container.addEventListener("click", (event) => {
      if (!this.state || !this.state.turn) return;
      const space = this.getSpace(event.offsetX, event.offsetY);
      if (!space) return;
      const { row, column } = space;
      if (this.state.board[row][column]) return;
      this.showLoading("Waiting for turn.");
      this.state.board[row][column] = this.state.piece;
      this.state.turn = false;
      this.drawPieces();
      this.drawIndicator();
      this.send({ action: "move", move: space });
    });

    this.draw();
  }

  draw() {
    super.draw();
    this.drawBoard();
    this.drawPieces();
  }

  resize() {
    const viewport = super.resize();
    this.setProperties(viewport);
  }

  update(state) {
    super.update(state);
    this.drawPieces();
    if (this.state.winner) {
      this.drawWinner();
    }
  }

  setProperties(viewport) {
    const { width, height } = viewport;

    // Is the viewport portrait or landscape orientation?  Use the
    // smaller of the horizontal or vertical dimension as the basis for
    // margins and padding units.
    const min = Math.min(width, height);

    const m = Math.trunc(min * 0.05);
    const margin = { top: m, bottom: 0, left: m, right: m };

    const aspectRatio = { width: COLUMNS, height: ROWS };

    // Get a box for the area of a canvas inside the margins.
    const inner = Game.trimBox(viewport, margin);

    // Get a box that's evenly divisible by COLUMNS x ROWS.
    const grid = Game.fitBox(inner, aspectRatio);

    // Center that box in the inner canvas.
    Object.assign(grid, Game.centerBox(inner, grid));

    const cells = [];
    const cellSize = grid.width / aspectRatio.width;
    const cellCenter = Math.trunc(cellSize / 2);

    // Calculate the coordinates of each space in the grid.
    for (let row = 0; row < ROWS; row++) {
      cells.push([]);
      const top = grid.top + row * cellSize;
      const cy = top + cellCenter;
      for (let column = 0; column < COLUMNS; column++) {
        const left = grid.left + column * cellSize;
        const cx = left + cellCenter;
        // Board is indexed from the bottom up.
        cells[row].push({ top, left, cx, cy, column, row });
      }
    }

    this.properties = {
      grid,
      cells,
      cellSize,
      pieceRadius: Math.trunc(cellCenter * 0.5),
      gridLineWidth: Math.trunc(cellCenter * 0.2),
      pieceLineWidth: Math.trunc(cellCenter * 0.2),
    };
  }

  getSpace(x, y) {
    const { cellSize, grid } = this.properties;
    const { left, top } = grid;
    const right = left + grid.width;
    const bottom = top + grid.height;
    if (x > left && x < right && y > top && y < bottom) {
      const row = Math.trunc((y - top) / cellSize);
      const column = Math.trunc((x - left) / cellSize);
      return { row, column };
    }
    return null;
  }

  drawBoard() {
    const canvas = this.elements.board;
    const context = canvas.getContext("2d");
    const { grid, gridLineWidth, cellSize } = this.properties;

    context.strokeStyle = "darkgrey";
    context.lineWidth = gridLineWidth;

    const right = grid.left + grid.width;
    for (let row = 1; row < ROWS; row++) {
      const y = grid.top + row * cellSize;
      context.beginPath();
      context.moveTo(grid.left, y);
      context.lineTo(right, y);
      context.stroke();
    }

    const bottom = grid.top + grid.height;
    for (let column = 1; column < COLUMNS; column++) {
      const x = grid.left + column * cellSize;
      context.beginPath();
      context.moveTo(x, grid.top);
      context.lineTo(x, bottom);
      context.stroke();
    }
  }

  drawPieces() {
    if (!this.state) return;
    const canvas = this.elements.pieces;
    const context = canvas.getContext("2d");
    const { cells } = this.properties;
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < COLUMNS; column++) {
        const piece = this.state.board[row][column];
        if (piece) {
          const cell = cells[row][column];
          this.drawPiece(context, piece, cell.cx, cell.cy);
        }
      }
    }
  }

  drawWinner() {
    const { hints } = this.elements;
    const { winner, piece } = this.state;
    const { cellSize, cells } = this.properties;

    const context = hints.getContext("2d");
    Game.clearCanvas(hints, context);

    context.fillStyle = winner.piece == piece ? "darkgreen" : "darkred";
    for (const space of winner.line) {
      const cell = cells[space.row][space.column];
      context.fillRect(cell.left, cell.top, cellSize, cellSize);
    }
  }

  drawIndicator(space = null) {
    const { hints } = this.elements;
    const context = hints.getContext("2d");
    Game.clearCanvas(hints, context);

    if (this.state.turn && space) {
      if (!this.state.board[space.row][space.column]) {
        const { cellSize, cells } = this.properties;
        const cell = cells[space.row][space.column];

        context.fillStyle = "indigo";
        context.fillRect(cell.left, cell.top, cellSize, cellSize);

        this.drawPiece(context, this.state.piece, cell.cx, cell.cy);
      }
    }
  }

  drawPiece(context, piece, x, y) {
    switch (piece) {
      case "x":
        this.drawX(context, x, y);
        break;
      case "o":
        this.drawO(context, x, y);
        break;
    }
  }

  drawX(context, x, y) {
    const r = this.properties.pieceRadius;
    context.strokeStyle = "white";
    context.lineWidth = this.properties.pieceLineWidth;
    context.beginPath();
    context.moveTo(x - r, y - r);
    context.lineTo(x + r, y + r);
    context.stroke();
    context.beginPath();
    context.moveTo(x + r, y - r);
    context.lineTo(x - r, y + r);
    context.stroke();
  }

  drawO(context, x, y) {
    const r = this.properties.pieceRadius;
    context.strokeStyle = "white";
    context.lineWidth = this.properties.pieceLineWidth;
    context.beginPath();
    context.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
    context.stroke();
  }
}

window.addEventListener("load", () => new TicTacToe());
