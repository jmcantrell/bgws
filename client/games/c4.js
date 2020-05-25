import GameClient from "/game.js";
import * as game from "/lib/games/c4.js";

const colors = ["gold", "darkred"];

class ConnectFour extends GameClient {
  constructor() {
    super(game);

    this.addLayer("pieces");
    this.addLayer("hints");
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
        if (space) {
          const { column } = space;
          const row = game.getNextRow(this.state.board, column);
          if (row >= 0) this.move(column);
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

  move(column) {
    super.move({ column });
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
    const frame = GameClient.fitBox(inner, aspectRatio);
    frame.top = inner.top;

    // Center that box in the inner canvas.
    frame.left = GameClient.centerBoxHorizontal(inner, frame);

    // Grid is another box with the right aspect ratio, but shrunk.
    const padding = Math.trunc(min * 0.01);
    const grid = GameClient.fitBox(
      {
        width: frame.width - padding * 2,
        height: frame.height - padding * 2,
      },
      aspectRatio
    );
    grid.top = GameClient.centerBoxVertical(frame, grid);
    grid.left = GameClient.centerBoxHorizontal(frame, grid);

    const cells = game.createGrid();
    const bottom = grid.top + grid.height;
    const cellSize = Math.trunc(grid.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    for (const space of game.getSpaces()) {
      const left = grid.left + space.column * cellSize;
      const top = bottom - space.row * cellSize - cellSize;
      const cx = left + cellCenter;
      const cy = top + cellCenter;
      game.setCell(cells, space, { top, left, cx, cy });
    }

    this.properties = { grid, frame, cells, cellSize };
  }

  getSpace(x, y) {
    const { cellSize, grid } = this.properties;
    const { left, top } = grid;
    const right = left + grid.width;
    const bottom = top + grid.height;
    if (x > left && x < right && y > top && y < bottom) {
      const row = Math.trunc((bottom - y) / cellSize);
      const column = Math.trunc((x - left) / cellSize);
      return { row, column };
    }
    return null;
  }

  getCell(space) {
    const { cells } = this.properties;
    return game.getCell(cells, space);
  }

  drawPieces() {
    if (!this.state) return;
    const canvas = this.elements.pieces;
    const context = canvas.getContext("2d");
    const { board } = this.state;
    for (const { space, piece } of game.getAllPieces(board)) {
      this.drawPiece(context, space, piece);
    }
  }

  drawPiece(context, space, piece) {
    const cell = this.getCell(space);
    const { cellSize } = this.properties;
    context.fillStyle = colors[piece.player];
    context.fillRect(cell.left, cell.top, cellSize, cellSize);
  }

  getSize(scale) {
    const { cellSize } = this.properties;
    return Math.trunc(cellSize * scale);
  }

  drawBoard() {
    if (!this.state) return;

    const canvas = this.elements.board;
    const context = canvas.getContext("2d");

    const { frame } = this.properties;
    context.fillStyle = "darkblue";
    context.globalCompositeOperation = "xor";
    context.fillRect(frame.left, frame.top, frame.width, frame.height);

    const radius = this.getSize(0.4);
    context.fillStyle = "white";
    for (const space of game.getSpaces()) {
      const cell = this.getCell(space);
      context.beginPath();
      context.ellipse(cell.cx, cell.cy, radius, radius, 0, 0, 2 * Math.PI);
      context.fill();
    }
  }

  drawHints(space = null) {
    const canvas = this.elements.hints;
    const context = canvas.getContext("2d");
    GameClient.clearCanvas(canvas, context);

    if (!space || !this.isMyTurn()) return;

    const row = game.getNextRow(this.state.board, space.column);
    const cell = this.getCell({ row, column: space.column });

    if (!cell) return;

    const { grid } = this.properties;

    context.strokeStyle = "white";
    context.lineWidth = this.getSize(0.08);
    context.beginPath();
    context.moveTo(cell.cx, grid.top);
    context.lineTo(cell.cx, cell.cy);
    context.stroke();
    context.closePath();

    const arrowRadius = this.getSize(0.2);
    context.beginPath();
    context.moveTo(cell.cx - arrowRadius, cell.cy - arrowRadius);
    context.lineTo(cell.cx, cell.cy);
    context.lineTo(cell.cx + arrowRadius, cell.cy - arrowRadius);
    context.stroke();
    context.closePath();

    const pieceRadius = this.getSize(0.4);
    context.fillStyle = colors[this.player];
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

  drawWinner() {
    if (!this.state || !this.state.winner) return;

    const canvas = this.elements.hints;
    const context = canvas.getContext("2d");
    GameClient.clearCanvas(canvas, context);

    const { winner } = this.state;

    for (const space of winner.line) {
      const cell = this.getCell(space);
      const won = winner.player == this.player;
      const color = winner.player == 0 ? "black" : "white";
      this.drawFace(context, cell.cx, cell.cy, color, won);
    }
  }

  drawFace(context, cx, cy, color, won) {
    const width = this.getSize(0.06);
    const radius = this.getSize(0.15);

    context.fillStyle = color;
    context.beginPath();
    context.ellipse(cx - radius, cy - radius, width, width, 0, 0, 2 * Math.PI);
    context.ellipse(cx + radius, cy - radius, width, width, 0, 0, 2 * Math.PI);
    context.fill();

    const offset = won ? 0 : radius;

    context.lineCap = "round";
    context.lineWidth = width;
    context.strokeStyle = color;
    context.beginPath();
    context.arc(cx, cy + offset, radius, Math.PI, 2 * Math.PI, won);
    context.stroke();
  }
}

window.addEventListener("load", () => new ConnectFour());
