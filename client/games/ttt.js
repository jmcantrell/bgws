import GameClientBase from "/game.js";
import * as grid from "/lib/grid.js";
import * as rect from "/lib/rect.js";
import * as game from "/lib/games/ttt.js";

export default class GameClient extends GameClientBase {
  constructor({ url }) {
    super({ url, game });

    this.addLayer("hints");
    this.addLayer("pieces");
    this.addLayer("board");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (this.isMyTurn()) {
        this.drawHints(this.getSpace(event.offsetX, event.offsetY));
      }
    });

    this.elements.container.addEventListener("click", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        if (space && !grid.getValue(this.state.board, space)) {
          this.move(space);
        }
      }
    });

    this.draw();
  }

  draw() {
    if (this.state) {
      super.draw();
      this.drawBoard();
      this.drawPieces();
      this.drawHints();
      if (this.state.winner) {
        this.drawWinner(this.state.winner);
      }
    }
  }

  resize() {
    const viewport = super.resize();
    this.setScale(viewport);
  }

  setScale(viewport) {
    const { width, height } = viewport;
    const aspectRatio = { width: game.columns, height: game.rows };

    // Is the viewport portrait or landscape orientation?  Use the
    // smaller of the horizontal or vertical dimension as the basis for
    // margins and padding units.
    const min = Math.min(width, height);

    const m = Math.trunc(min * 0.05);
    const margin = { top: m, bottom: m, left: m, right: m };

    // Get a box for the area of a canvas inside the margins.
    const inner = rect.trim(viewport, margin);

    // Get a box that's evenly divisible by COLUMNS x ROWS.
    const board = rect.fit(inner, aspectRatio);
    board.top = inner.top;
    board.left = rect.getCenterHorizontal(inner, board);

    const cells = game.createGrid();
    const cellSize = Math.trunc(board.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    // Calculate the coordinates of each space in the board.
    for (const space of game.getSpaces()) {
      const left = board.left + space.column * cellSize;
      const top = board.top + space.row * cellSize;
      const cx = left + cellCenter;
      const cy = top + cellCenter;
      grid.setValue(cells, space, { top, left, cx, cy });
    }

    this.scale = { board, cells, cellSize };
  }

  getSpace(x, y) {
    const { cellSize } = this.scale;
    const { left, top, width, height } = this.scale.board;

    const right = left + width;
    const bottom = top + height;

    if (x > left && x < right && y > top && y < bottom) {
      const row = Math.trunc((y - top) / cellSize);
      const column = Math.trunc((x - left) / cellSize);
      return { row, column };
    }

    return null;
  }

  getSize(scale) {
    const { cellSize } = this.scale;
    return Math.trunc(cellSize * scale);
  }

  drawBoard() {
    const context = this.getContext(this.elements.board);

    const { cellSize } = this.scale;
    const { left, top, width, height } = this.scale.board;

    context.strokeStyle = "darkgrey";
    context.lineWidth = this.getSize(0.1);

    const right = left + width;
    const bottom = top + height;

    for (let row = 1; row < game.rows; row++) {
      const y = top + row * cellSize;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }

    for (let column = 1; column < game.columns; column++) {
      const x = left + column * cellSize;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }
  }

  drawPieces() {
    const context = this.getContext(this.elements.pieces);

    for (const space of game.getSpaces()) {
      const piece = grid.getValue(this.state.board, space);
      if (piece) this.drawPiece(context, space, piece.player);
    }
  }

  drawWinner(winner) {
    const context = this.getContext(this.elements.hints);

    const { line, player } = winner;
    const { cells, cellSize } = this.scale;

    context.fillStyle = player == this.player ? "darkgreen" : "darkred";

    for (const space of line) {
      const { left, top } = grid.getValue(cells, space);
      context.fillRect(left, top, cellSize, cellSize);
    }
  }

  drawHints(space = null) {
    const context = this.getContext(this.elements.hints);

    // Don't draw indicator on space that is occupied.
    if (!space || grid.getValue(this.state.board, space)) return;

    const { cells, cellSize } = this.scale;
    const { left, top } = grid.getValue(cells, space);

    context.fillStyle = "indigo";
    context.fillRect(left, top, cellSize, cellSize);

    this.drawPiece(context, space, this.player);
  }

  drawPiece(context, space, player) {
    const { cx, cy } = grid.getValue(this.scale.cells, space);
    const radius = this.getSize(0.25);

    context.strokeStyle = "white";
    context.lineWidth = this.getSize(0.1);

    if (player == 0) {
      this.drawX(context, cx, cy, radius);
    } else {
      this.drawO(context, cx, cy, radius);
    }
  }

  drawX(context, x, y, radius) {
    context.beginPath();
    context.moveTo(x - radius, y - radius);
    context.lineTo(x + radius, y + radius);
    context.stroke();
    context.beginPath();
    context.moveTo(x + radius, y - radius);
    context.lineTo(x - radius, y + radius);
    context.stroke();
  }

  drawO(context, x, y, radius) {
    context.beginPath();
    context.ellipse(x, y, radius, radius, 0, 0, 2 * Math.PI);
    context.stroke();
  }
}
