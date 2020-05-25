import GameClient from "/game.js";
import * as game from "/lib/games/ttt.js";

class TicTacToe extends GameClient {
  constructor() {
    super(game);

    this.addLayer("hints");
    this.addLayer("pieces");
    this.addLayer("board");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        this.drawHints(space);
      }
    });

    this.elements.container.addEventListener("click", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        if (space && !game.getCell(this.state.board, space)) {
          this.move(space);
        }
      }
    });

    this.draw();
  }

  draw() {
    super.draw();
    this.drawBoard();
    this.drawPieces();
    this.drawHints();
    this.drawWinner();
  }

  resize() {
    const viewport = super.resize();
    this.setProperties(viewport);
  }

  setProperties(viewport) {
    const { width, height } = viewport;

    // Is the viewport portrait or landscape orientation?  Use the
    // smaller of the horizontal or vertical dimension as the basis for
    // margins and padding units.
    const min = Math.min(width, height);

    const m = Math.trunc(min * 0.05);
    const margin = { top: m, bottom: m, left: m, right: m };

    const aspectRatio = { width: game.columns, height: game.rows };

    // Get a box for the area of a canvas inside the margins.
    const inner = GameClient.trimBox(viewport, margin);

    // Get a box that's evenly divisible by COLUMNS x ROWS.
    const grid = GameClient.fitBox(inner, aspectRatio);
    grid.top = inner.top;
    grid.left = GameClient.centerBoxHorizontal(inner, grid);

    const cells = game.createGrid();
    const cellSize = Math.trunc(grid.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    // Calculate the coordinates of each space in the grid.
    for (const space of game.getSpaces()) {
      const left = grid.left + space.column * cellSize;
      const top = grid.top + space.row * cellSize;
      const cx = left + cellCenter;
      const cy = top + cellCenter;
      // Board is indexed from the bottom up.
      game.setCell(cells, space, { top, left, cx, cy });
    }

    this.properties = { grid, cells, cellSize };
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

  getSize(scale) {
    const { cellSize } = this.properties;
    return Math.trunc(cellSize * scale);
  }

  getCell(space) {
    const { cells } = this.properties;
    return game.getCell(cells, space);
  }

  drawBoard() {
    if (!this.state) return;
    const canvas = this.elements.board;
    const context = canvas.getContext("2d");
    const { grid, cellSize } = this.properties;

    context.strokeStyle = "darkgrey";
    context.lineWidth = this.getSize(0.1);

    const right = grid.left + grid.width;
    for (let row = 1; row < game.rows; row++) {
      const y = grid.top + row * cellSize;
      context.beginPath();
      context.moveTo(grid.left, y);
      context.lineTo(right, y);
      context.stroke();
    }

    const bottom = grid.top + grid.height;
    for (let column = 1; column < game.columns; column++) {
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
    for (const { space, piece } of game.getAllPieces(this.state.board)) {
      this.drawPiece(context, space, piece.player);
    }
  }

  drawWinner() {
    if (!this.state || !this.state.winner) return;

    const canvas = this.elements.hints;
    const context = canvas.getContext("2d");
    GameClient.clearCanvas(canvas, context);

    const { winner } = this.state;
    const { cellSize } = this.properties;

    context.fillStyle = winner.player == this.player ? "darkgreen" : "darkred";
    for (const space of winner.line) {
      const cell = this.getCell(space);
      context.fillRect(cell.left, cell.top, cellSize, cellSize);
    }
  }

  drawHints(space = null) {
    const canvas = this.elements.hints;
    const context = canvas.getContext("2d");
    GameClient.clearCanvas(canvas, context);

    if (!space || !this.isMyTurn()) return;

    const { board } = this.state;

    if (game.getCell(board, space)) return;

    const { cellSize } = this.properties;
    const cell = this.getCell(space);

    context.fillStyle = "indigo";
    context.fillRect(cell.left, cell.top, cellSize, cellSize);

    this.drawPiece(context, space, this.player);
  }

  drawPiece(context, space, player) {
    const cell = this.getCell(space);
    const r = this.getSize(0.25);
    context.strokeStyle = "white";
    context.lineWidth = this.getSize(0.1);
    switch (player) {
      case 0:
        this.drawX(context, cell.cx, cell.cy, r);
        break;
      case 1:
        this.drawO(context, cell.cx, cell.cy, r);
        break;
    }
  }

  drawX(context, x, y, r) {
    context.beginPath();
    context.moveTo(x - r, y - r);
    context.lineTo(x + r, y + r);
    context.stroke();
    context.beginPath();
    context.moveTo(x + r, y - r);
    context.lineTo(x - r, y + r);
    context.stroke();
  }

  drawO(context, x, y, r) {
    context.beginPath();
    context.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
    context.stroke();
  }
}

window.addEventListener("load", () => new TicTacToe());
