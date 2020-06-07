import GameClientBase from "/game.js";
import * as grid from "/lib/grid.js";
import * as rect from "/lib/rect.js";
import * as game from "/lib/games/c4.js";

const colors = ["gold", "darkred"];

export default class GameClient extends GameClientBase {
  constructor({ url }) {
    super({ url, game });

    this.addLayer("pieces");
    this.addLayer("hints");
    this.addLayer("board");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (this.isMyTurn()) {
        this.drawHints(this.getSpace(event.offsetX, event.offsetY));
      }
    });

    this.elements.container.addEventListener("click", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        if (space && game.getPlayableSpace(this.state.board, space.column)) {
          this.move(space.column);
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

  move(column) {
    super.move({ column });
  }

  setScale(viewport) {
    const { width, height } = viewport;
    const aspectRatio = { width: game.columns, height: game.rows };

    // Is the viewport portrait or landscape orientation?  Use the
    // smaller of the horizontal or vertical dimension as the basis for
    // margins and padding units.
    const min = Math.min(width, height);

    // Get a box for the area of a canvas inside the margins.
    const m = Math.trunc(min * 0.05);
    const margin = { top: m, bottom: m, left: m, right: m };
    const inner = rect.trim(viewport, margin);

    // Get a box that's evenly divisible by COLUMNS x ROWS.
    const frame = rect.fit(inner, aspectRatio);
    frame.top = inner.top;

    // Center that box in the inner canvas.
    frame.left = rect.getCenterHorizontal(inner, frame);

    // Another box with the right aspect ratio, but shrunk.
    const padding = Math.trunc(min * 0.01);
    const board = rect.fit(
      {
        width: frame.width - padding * 2,
        height: frame.height - padding * 2,
      },
      aspectRatio
    );
    board.top = rect.getCenterVertical(frame, board);
    board.left = rect.getCenterHorizontal(frame, board);

    const cells = game.createBoard();
    const bottom = board.top + board.height;
    const cellSize = Math.trunc(board.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    for (const space of game.getSpaces()) {
      const left = board.left + space.column * cellSize;
      const top = bottom - space.row * cellSize - cellSize;
      const cx = left + cellCenter;
      const cy = top + cellCenter;
      grid.setValue(cells, space, { top, left, cx, cy });
    }

    this.scale = { board, frame, cells, cellSize };
  }

  getSpace(x, y) {
    const { cellSize } = this.scale;
    const { left, top, width, height } = this.scale.board;

    const right = left + width;
    const bottom = top + height;

    if (x > left && x < right && y > top && y < bottom) {
      const row = Math.trunc((bottom - y) / cellSize);
      const column = Math.trunc((x - left) / cellSize);
      return { row, column };
    }

    return null;
  }

  drawPieces() {
    const context = this.getContext(this.elements.pieces);

    for (const space of game.getSpaces()) {
      const piece = grid.getValue(this.state.board, space);
      if (piece) this.drawPiece(context, space, piece);
    }
  }

  drawPiece(context, space, piece) {
    const { cells, cellSize } = this.scale;
    const { left, top } = grid.getValue(cells, space);
    context.fillStyle = colors[piece.player];
    context.fillRect(left, top, cellSize, cellSize);
  }

  getSize(scale) {
    const { cellSize } = this.scale;
    return Math.trunc(cellSize * scale);
  }

  drawBoard() {
    const context = this.getContext(this.elements.board);

    const { left, top, width, height } = this.scale.frame;
    const radius = this.getSize(0.4);

    // Draw the board background.
    context.fillStyle = "darkblue";
    context.fillRect(left, top, width, height);

    // Use xor to punch out holes.
    context.fillStyle = "white";
    context.globalCompositeOperation = "xor";

    for (const space of game.getSpaces()) {
      const { cx, cy } = grid.getValue(this.scale.cells, space);
      context.beginPath();
      context.ellipse(cx, cy, radius, radius, 0, 0, 2 * Math.PI);
      context.fill();
    }
  }

  drawHints(space = null) {
    const context = this.getContext(this.elements.hints);

    if (!space) return;

    const playableSpace = game.getPlayableSpace(this.state.board, space.column);

    if (!playableSpace) return;

    const { top } = this.scale.board;
    const { cx, cy } = grid.getValue(this.scale.cells, playableSpace);
    const arrowRadius = this.getSize(0.2);
    const pieceRadius = this.getSize(0.4);

    context.strokeStyle = "white";
    context.fillStyle = colors[this.player];
    context.lineWidth = this.getSize(0.08);

    context.beginPath();
    context.moveTo(cx, top);
    context.lineTo(cx, cy);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.moveTo(cx - arrowRadius, cy - arrowRadius);
    context.lineTo(cx, cy);
    context.lineTo(cx + arrowRadius, cy - arrowRadius);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.ellipse(
      cx,
      top - pieceRadius,
      pieceRadius,
      pieceRadius,
      0,
      0,
      2 * Math.PI
    );
    context.fill();
  }

  drawWinner(winner) {
    const context = this.getContext(this.elements.hints);

    for (const space of winner.line) {
      const cell = grid.getValue(this.scale.cells, space);
      const won = winner.player == this.player;
      const color = winner.player == 0 ? "black" : "white";
      this.drawFace(context, cell.cx, cell.cy, color, won);
    }
  }

  drawFace(context, cx, cy, color, won) {
    const width = this.getSize(0.06);
    const radius = this.getSize(0.15);

    context.lineCap = "round";
    context.lineWidth = width;
    context.fillStyle = color;
    context.strokeStyle = color;

    context.beginPath();
    context.ellipse(cx - radius, cy - radius, width, width, 0, 0, 2 * Math.PI);
    context.ellipse(cx + radius, cy - radius, width, width, 0, 0, 2 * Math.PI);
    context.fill();

    const offset = won ? 0 : radius;

    context.beginPath();
    context.arc(cx, cy + offset, radius, Math.PI, 2 * Math.PI, won);
    context.stroke();
  }
}
