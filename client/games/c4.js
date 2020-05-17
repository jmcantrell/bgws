import Game from "/game.js";

const COLUMNS = 7;
const ROWS = 6;

class ConnectFour extends Game {
  constructor() {
    super("c4");
    this.addLayer("pieces");
    this.addLayer("hints");
    this.addLayer("board");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (!this.state || !this.state.turn) return;
      const column = this.getColumn(event.offsetX, event.offsetY);
      this.drawHints(column);
    });

    this.elements.container.addEventListener("click", (event) => {
      if (!this.state || !this.state.turn) return;
      const column = this.getColumn(event.offsetX, event.offsetY);
      if (column === null) return;
      const cell = this.getEmptyCell(column);
      if (cell === null) return;
      this.showLoading("Waiting for turn.");
      this.state.board[cell.column][cell.row] = this.state.piece;
      this.state.turn = false;
      this.drawPieces();
      this.drawHints();
      this.send({ action: "move", move: { column } });
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
    const frame = Game.fitBox(inner, aspectRatio);

    // Center that box in the inner canvas.
    Object.assign(frame, Game.centerBox(inner, frame));

    // Grid is another box with the right aspect ratio, but shrunk.
    const padding = Math.trunc(min * 0.01);
    const grid = Game.fitBox(
      {
        width: frame.width - padding * 2,
        height: frame.height - padding * 2,
      },
      aspectRatio
    );
    Object.assign(grid, Game.centerBox(frame, grid));

    const cells = [];
    const bottom = grid.top + grid.height;
    const cellSize = grid.width / aspectRatio.width;
    const cellCenter = Math.trunc(cellSize / 2);

    // Calculate the coordinates of each space in the grid.
    for (let column = 0; column < COLUMNS; column++) {
      cells.push([]);
      const left = grid.left + column * cellSize;
      const cx = left + cellCenter;
      for (let row = 0; row < ROWS; row++) {
        // Board is indexed from the bottom up.
        const top = bottom - row * cellSize - cellSize;
        const cy = top + cellCenter;
        cells[column].push({ top, left, cx, cy, column, row });
      }
    }

    this.properties = {
      grid,
      frame,
      cells,
      cellSize,
      holeRadius: Math.trunc(cellCenter * 0.7),
      pieceRadius: Math.trunc(cellCenter * 0.8),
    };
  }

  getColumn(x, y) {
    const { cellSize, grid } = this.properties;
    const { left, top } = grid;
    const right = left + grid.width;
    const bottom = top + grid.height;
    if (x > left && x < right && y > top && y < bottom) {
      return Math.trunc((x - left) / cellSize);
    }
    return null;
  }

  getEmptyCell(column) {
    const row = this.state.board[column].findIndex((p) => p === null);
    return this.properties.cells[column][row];
  }

  drawPieces() {
    if (!this.state) return;
    const canvas = this.elements.pieces;
    const context = canvas.getContext("2d");
    const { cells, cellSize } = this.properties;
    for (let column = 0; column < COLUMNS; column++) {
      for (let row = 0; row < ROWS; row++) {
        const piece = this.state.board[column][row];
        if (piece) {
          const cell = cells[column][row];
          context.fillStyle = piece;
          context.fillRect(cell.left, cell.top, cellSize, cellSize);
        }
      }
    }
  }

  drawBoard() {
    const canvas = this.elements.board;
    const context = canvas.getContext("2d");
    const { frame, cells, holeRadius } = this.properties;

    context.globalCompositeOperation = "xor";

    context.fillStyle = "blue";
    context.fillRect(frame.left, frame.top, frame.width, frame.height);

    context.fillStyle = "white";
    for (const column of cells) {
      for (const cell of column) {
        context.beginPath();
        context.ellipse(
          cell.cx,
          cell.cy,
          holeRadius,
          holeRadius,
          0,
          0,
          2 * Math.PI
        );
        context.fill();
      }
    }
  }

  drawHints(column = null) {
    const { hints } = this.elements;
    const context = hints.getContext("2d");
    Game.clearCanvas(hints, context);
    if (this.state.turn && column !== null) {
      this.drawIndicator(context, column);
    }
  }

  drawIndicator(context, column) {
    const { pieceRadius, cellSize, grid } = this.properties;

    const cell = this.getEmptyCell(column);

    context.strokeStyle = "white";
    context.lineWidth = Math.trunc(cellSize * 0.08);
    context.beginPath();
    context.moveTo(cell.cx, grid.top);
    context.lineTo(cell.cx, cell.cy);
    context.stroke();
    context.closePath();

    const r = Math.trunc(cellSize / 6);
    context.beginPath();
    context.moveTo(cell.cx - r, cell.cy - r);
    context.lineTo(cell.cx, cell.cy);
    context.lineTo(cell.cx + r, cell.cy - r);
    context.stroke();
    context.closePath();

    context.fillStyle = this.state.piece;
    context.beginPath();
    context.ellipse(
      cell.cx,
      grid.top - pieceRadius,
      pieceRadius,
      pieceRadius,
      0,
      0,
      2 * Math.PI
    );
    context.fill();
  }
}

window.addEventListener("load", () => new ConnectFour());
