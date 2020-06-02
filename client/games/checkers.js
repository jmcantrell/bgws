import GameClientBase from "/game.js";
import * as rect from "/lib/rect.js";
import * as game from "/lib/games/checkers.js";
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
    this.setIndexedMoves();
  }

  draw() {
    super.draw();
    this.drawBoard();
    this.drawPieces();
    this.drawHints();
  }

  resize() {
    const viewport = super.resize();
    this.setProperties(viewport);
  }

  move() {
    super.move(this.selectedMove);
    delete this.targets;
    delete this.selected;
    delete this.selectable;
    delete this.selectedMove;
  }

  onSpaceClick(space) {
    if (this.getMoves(space) && !this.isJumpStarted()) {
      this.selectPiece(space);
    } else {
      this.selectTarget(space);
    }
    this.draw();
  }

  selectPiece(space) {
    this.selected = space;
    this.selectedMove = { from: space };
    const { jumps, hops } = this.getMoves(space);

    if (jumps) {
      this.selectedMove.jump = [];
      this.targets = jumps.map((jump) => jump[0].space);
    } else {
      this.targets = hops;
    }
  }

  selectTarget(space) {
    if (this.isTarget(space)) {
      if (this.selectedMove.jump) {
        const jumps = this.addJumpStep(space);
        if (jumps.length == 0) this.move();
      } else {
        this.selectedMove.hop = space;
        this.move();
      }
    }
  }

  addJumpStep(space) {
    const n = this.selectedMove.jump.length;

    // Filter the possible jumps to the ones matching the jump step.
    const moves = this.getMoves(this.selectedMove.from);
    let jumps = moves.jumps.filter(
      (jump) => jump.length > n && game.sameSpace(jump[n].space, space)
    );

    // Get the jump step information.
    // Every possible jump that remains has the same prefix.
    const step = jumps[0][n];
    this.selectedMove.jump.push(step.space);

    // Move the piece and clear capture.
    const { board } = this.state;
    game.setCell(board, step.capture.space, null);
    game.moveCell(board, this.selected, space);

    // Determine if there are any further jump steps.
    jumps = jumps.filter((jump) => jump.length > n + 1);

    // Set selection targets.
    if (jumps.length > 0) {
      this.targets = jumps.map((jump) => jump[n + 1].space);
    } else {
      delete this.targets;
    }

    // Select the new location.
    this.selected = space;

    // Ensure that jump cannot be taken back, once started.
    delete this.selectable;

    return jumps;
  }

  isJumpStarted() {
    return (
      this.selectedMove &&
      this.selectedMove.jump &&
      this.selectedMove.jump.length > 0
    );
  }

  setIndexedMoves() {
    const allHops = [];
    const allJumps = [];

    const { board } = this.state;

    // Group all available moves by type.
    for (const { space } of game.getPieces(board, this.player)) {
      const moves = game.getMoves(board, space);
      if (moves) {
        const { hops, jumps } = moves;
        if (hops) allHops.push({ space, hops });
        if (jumps) allJumps.push({ space, jumps });
      }
    }

    this.selectable = [];
    this.indexedMoves = game.createGrid();

    // If there are any jumps available, they must be preferred.
    if (allJumps.length > 0) {
      for (const moves of allJumps) {
        const { space, jumps } = moves;
        this.selectable.push(space);
        const { row, column } = space;
        this.indexedMoves[row][column] = { jumps };
      }
    } else if (allHops.length > 0) {
      for (const moves of allHops) {
        const { space, hops } = moves;
        this.selectable.push(space);
        const { row, column } = space;
        this.indexedMoves[row][column] = { hops };
      }
    }

    this.draw();
  }

  isSelectable(space) {
    if (!this.selectable) return false;
    return this.selectable.some((s) => game.sameSpace(s, space));
  }

  isTarget(space) {
    if (!this.targets) return null;
    return this.targets.find((t) => game.sameSpace(t, space));
  }

  getMoves(space) {
    const { row, column } = space;
    return this.indexedMoves[row][column];
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
    const inner = rect.trim(viewport, margin);

    // Get a box that's evenly divisible by COLUMNS x ROWS.
    const frame = rect.fit(inner, aspectRatio);
    frame.top = inner.top;

    // Center that box in the inner canvas.
    frame.left = rect.getCenterHorizontal(inner, frame);

    // Grid is another box with the right aspect ratio, but shrunk.
    const padding = Math.trunc(min * 0.01);
    const grid = rect.fit(
      {
        width: frame.width - padding * 2,
        height: frame.height - padding * 2,
      },
      aspectRatio
    );
    grid.top = rect.getCenterVertical(frame, grid);
    grid.bottom = grid.top + grid.height;
    grid.left = rect.getCenterHorizontal(frame, grid);
    grid.right = grid.left + grid.width;

    const cells = game.createGrid();
    const cellSize = Math.trunc(grid.width / aspectRatio.width);
    const cellCenter = Math.trunc(cellSize / 2);

    for (const space of game.getSpaces()) {
      let cx, cy, left, top;
      if (this.player == 0) {
        left = grid.left + space.column * cellSize;
        top = grid.top + space.row * cellSize;
        cx = left + cellCenter;
        cy = top + cellCenter;
      } else {
        const right = grid.right - space.column * cellSize;
        const bottom = grid.bottom - space.row * cellSize;
        left = right - cellSize;
        top = bottom - cellSize;
        cx = right - cellCenter;
        cy = bottom - cellCenter;
      }
      game.setCell(cells, space, { top, left, cx, cy });
    }

    this.properties = { frame, grid, cells, cellSize };
  }

  getSpace(x, y) {
    const { cellSize, grid } = this.properties;
    const { top, bottom, left, right } = grid;
    if (x > left && x < right && y > top && y < bottom) {
      let row, column;
      if (this.player == 0) {
        row = Math.trunc((y - top) / cellSize);
        column = Math.trunc((x - left) / cellSize);
      } else {
        row = Math.trunc((bottom - y) / cellSize);
        column = Math.trunc((right - x) / cellSize);
      }
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

    const { frame, grid, cells, cellSize } = this.properties;

    context.fillStyle = "darkgrey";
    context.fillRect(frame.left, frame.top, frame.width, frame.height);

    context.fillStyle = "#f0dc82";
    context.fillRect(grid.left, grid.top, grid.width, grid.height);

    context.fillStyle = "green";
    for (const space of game.getSpaces()) {
      const cell = game.getCell(cells, space);
      if (cell) {
        context.fillRect(cell.left, cell.top, cellSize, cellSize);
      }
    }
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
    const cell = this.getCell(space);
    const radius = this.getSize(0.35);
    context.fillStyle = colors[piece.player];
    context.strokeStyle = "darkgrey";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(cell.cx, cell.cy, radius, radius, 0, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    if (piece.king) {
      const radius = this.getSize(0.15);
      context.fillStyle = "white";
      context.beginPath();
      context.ellipse(cell.cx, cell.cy, radius, radius, 0, 0, 2 * Math.PI);
      context.fill();
    }
  }

  drawSelected(context, space) {
    const cell = this.getCell(space);
    const radius = this.getSize(0.4);
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.setLineDash([]);
    context.beginPath();
    context.ellipse(cell.cx, cell.cy, radius, radius, 0, 0, 2 * Math.PI);
    context.stroke();
  }

  drawSelectable(context, space) {
    const cell = this.getCell(space);
    const radius = this.getSize(0.4);
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.ellipse(cell.cx, cell.cy, radius, radius, 0, 0, 2 * Math.PI);
    context.stroke();
  }
}
