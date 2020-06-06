import * as grid from "/lib/grid.js";
import * as rect from "/lib/rect.js";
import * as game from "/lib/games/checkers.js";
import GameClientBase from "/game.js";
import { clear as clearCanvas } from "/lib/canvas.js";

const colors = ["black", "darkred"];

export default class GameClient extends GameClientBase {
  constructor({ url }) {
    super({ url, game });

    this.addLayer("board");
    this.addLayer("pieces");
    this.addLayer("hints");

    this.elements.container.addEventListener("mousemove", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        this.drawHints(space);
      }
    });

    this.elements.container.addEventListener("click", (event) => {
      if (this.isMyTurn()) {
        const space = this.getSpace(event.offsetX, event.offsetY);
        if (space) this.onSpaceClick(space);
      }
    });

    this.draw();
  }

  update(state) {
    super.update(state);
    this.setSelectable();
    this.draw();
  }

  draw() {
    super.draw();
    this.drawBoard();
    this.drawPieces();
    this.drawHints();
  }

  resize() {
    const viewport = super.resize();
    this.setScale(viewport);
  }

  move() {
    super.move(this.selectedMove);
    delete this.targets;
    delete this.selected;
    delete this.selectable;
    delete this.selectedMove;
    this.draw();
  }

  onSpaceClick(space) {
    if (this.isSelectable(space) && !this.isJumpStarted()) {
      this.selectPiece(space);
    } else {
      this.selectTarget(space);
    }
    this.draw();
  }

  selectPiece(space) {
    this.selected = space;
    const piece = grid.getValue(this.state.board, space);
    this.selectedMove = { from: space };
    const jumps = game.getJumps(this.state.board, space, piece);

    if (jumps.length > 0) {
      this.selectedMove.jump = [];
      this.targets = jumps.map((jump) => jump.space);
    } else {
      this.targets = game.getHops(this.state.board, space, piece);
    }
  }

  selectTarget(space) {
    if (this.isTarget(space)) {
      if (this.selectedMove.jump) {
        this.addJumpStep(space);
        if (this.targets.length == 0) {
          this.move();
        }
      } else {
        this.selectedMove.hop = space;
        this.move();
      }
    }
  }

  addJumpStep(space) {
    const piece = grid.getValue(this.state.board, this.selected);

    // Get the selected jump.
    const jump = game
      .getJumps(this.state.board, this.selected, piece)
      .find((jump) => grid.isSameSpace(jump.space, space));

    // Move the piece and clear capture.
    grid.setValue(this.state.board, jump.capture.space, null);
    grid.moveValue(this.state.board, this.selected, space);

    // Add the selected jump;
    this.selectedMove.jump.push(space);

    // Reset the selection to the new space.
    this.selected = space;

    // Ensure that jump cannot be taken back, once started.
    delete this.selectable;

    // Reset the jump targets to newly available jumps.
    this.targets = game
      .getJumps(this.state.board, this.selected, piece)
      .map((jump) => jump.space);
  }

  isJumpStarted() {
    return (
      this.selectedMove &&
      this.selectedMove.jump &&
      this.selectedMove.jump.length > 0
    );
  }

  setSelectable() {
    const hoppable = [];
    const jumpable = [];

    // Group all available moves by type.
    for (const space of game.getSpaces()) {
      const piece = grid.getValue(this.state.board, space);
      if (piece && piece.player == this.player) {
        const hops = game.getHops(this.state.board, space, piece);
        if (hops.length > 0) hoppable.push(space);
        const jumps = game.getJumps(this.state.board, space, piece);
        if (jumps.length > 0) jumpable.push(space);
      }
    }

    this.selectable = jumpable.length > 0 ? jumpable : hoppable;
  }

  isSelectable(space) {
    if (!this.selectable) return false;
    return this.selectable.some((s) => grid.isSameSpace(s, space));
  }

  isTarget(space) {
    if (!this.targets) return null;
    return this.targets.find((t) => grid.isSameSpace(t, space));
  }

  getMoves(space) {
    return grid.getValue(this.indexedMoves, space);
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
    const frame = rect.fit(inner, aspectRatio);
    frame.top = inner.top;

    // Center that box in the inner canvas.
    frame.left = rect.getCenterHorizontal(inner, frame);

    // Grid is another box with the right aspect ratio, but shrunk.
    const padding = Math.trunc(min * 0.01);
    const board = rect.fit(
      {
        width: frame.width - padding * 2,
        height: frame.height - padding * 2,
      },
      aspectRatio
    );
    board.top = rect.getCenterVertical(frame, board);
    board.bottom = board.top + board.height;
    board.left = rect.getCenterHorizontal(frame, board);
    board.right = board.left + board.width;

    const cells = game.createEmptyBoard();
    const cellSize = Math.trunc(board.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    for (const space of game.getSpaces()) {
      let cx, cy, left, top;
      if (this.player == 0) {
        const right = board.right - space.column * cellSize;
        const bottom = board.bottom - space.row * cellSize;
        left = right - cellSize;
        top = bottom - cellSize;
        cx = right - cellCenter;
        cy = bottom - cellCenter;
      } else {
        left = board.left + space.column * cellSize;
        top = board.top + space.row * cellSize;
        cx = left + cellCenter;
        cy = top + cellCenter;
      }
      grid.setValue(cells, space, { top, left, cx, cy });
    }

    this.scale = { frame, board, cells, cellSize };
  }

  getSpace(x, y) {
    const { cellSize } = this.scale;
    const { top, bottom, left, right } = this.scale.board;
    if (x > left && x < right && y > top && y < bottom) {
      let row, column;
      if (this.player == 0) {
        row = Math.trunc((bottom - y) / cellSize);
        column = Math.trunc((right - x) / cellSize);
      } else {
        row = Math.trunc((y - top) / cellSize);
        column = Math.trunc((x - left) / cellSize);
      }
      return { row, column };
    }
    return null;
  }

  getSize(scale) {
    const { cellSize } = this.scale;
    return Math.trunc(cellSize * scale);
  }

  drawBoard() {
    if (!this.state) return;

    const canvas = this.elements.board;
    const context = canvas.getContext("2d");

    const { frame, board, cells, cellSize } = this.scale;

    context.fillStyle = "darkgrey";
    context.fillRect(frame.left, frame.top, frame.width, frame.height);

    context.fillStyle = "#f0dc82";
    context.fillRect(board.left, board.top, board.width, board.height);

    context.fillStyle = "green";
    for (const space of game.getSpaces()) {
      const { left, top } = grid.getValue(cells, space);
      context.fillRect(left, top, cellSize, cellSize);
    }
  }

  drawPieces() {
    if (!this.state) return;

    const canvas = this.elements.pieces;
    const context = canvas.getContext("2d");

    for (const space of game.getSpaces()) {
      const piece = grid.getValue(this.state.board, space);
      if (piece) this.drawPiece(context, space, piece);
    }
  }

  drawHints(space = null) {
    const canvas = this.elements.hints;
    const context = canvas.getContext("2d");
    clearCanvas(canvas, context);

    if (!this.state || !this.isMyTurn()) return;

    if (this.selected) {
      this.drawSelected(context, this.selected);
    }

    if (this.selectable) {
      for (const space of this.selectable) {
        this.drawSelectable(context, space);
      }
    }

    if (this.targets) {
      for (const space of this.targets) {
        this.drawSelectable(context, space);
      }
    }

    if (space) {
      if (this.isTarget(space) || this.isSelectable(space)) {
        this.drawSelected(context, space);
      }
    }
  }

  drawPiece(context, space, piece) {
    const { cx, cy } = grid.getValue(this.scale.cells, space);
    const radius = this.getSize(0.35);
    context.fillStyle = colors[piece.player];
    context.strokeStyle = "darkgrey";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(cx, cy, radius, radius, 0, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    if (piece.king) {
      const radius = this.getSize(0.15);
      context.fillStyle = "white";
      context.beginPath();
      context.ellipse(cx, cy, radius, radius, 0, 0, 2 * Math.PI);
      context.fill();
    }
  }

  drawSelected(context, space) {
    const { cx, cy } = grid.getValue(this.scale.cells, space);
    const radius = this.getSize(0.4);
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.setLineDash([]);
    context.beginPath();
    context.ellipse(cx, cy, radius, radius, 0, 0, 2 * Math.PI);
    context.stroke();
  }

  drawSelectable(context, space) {
    const { cx, cy } = grid.getValue(this.scale.cells, space);
    const radius = this.getSize(0.4);
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.ellipse(cx, cy, radius, radius, 0, 0, 2 * Math.PI);
    context.stroke();
  }
}
