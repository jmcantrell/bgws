const WEBSOCKET_URL = location.origin.replace(/^http/, "ws");

export default class GameClient {
  constructor(game) {
    this.game = game;
    this.player = null;
    this.layers = [];
    this.elements = {};

    window.addEventListener("resize", () => {
      this.draw();
    });

    this.getElementsById({
      container: "container",
      loading: "loading",
      loadingText: "loading-text",
      loadingSpinner: "loading-spinner",
      message: "message",
      messageText: "message-text",
      messageOkay: "message-okay",
    });

    this.spinnerInterval = null;

    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.addEventListener("error", (error) => {
      console.error("websocket error", error);
    });

    this.ws.addEventListener("open", () => {
      console.log("websocket connection opened");
      this.showLoading("Waiting for opponent.");
      this.join(this.game.id);
    });

    this.ws.addEventListener("message", (event) => {
      const command = JSON.parse(event.data);
      console.log("received from server:", command);
      switch (command.action) {
        case "update":
          this.player = command.player;
          return this.update(command.state);
        case "end":
          return this.end(command.reason);
        default:
          console.error("unknown command", command);
      }
    });

    this.ws.addEventListener("close", () => {
      console.log("websocket connection closed");
      if (this.state) {
        this.state.turn = null;
        this.draw();
      }
    });

    this.elements.messageOkay.addEventListener("click", (event) => {
      event.preventDefault();
      this.hideMessage();
    });
  }

  update(state) {
    this.state = state;

    const { finished, winner, turn } = this.state;

    if (finished) {
      if (winner) {
        this.end(winner.player == this.player ? "You won!" : "You lost.");
      } else {
        this.end("It's a draw!");
      }
    } else {
      if (turn == this.player) {
        this.hideLoading();
      } else {
        this.showLoading("Waiting for turn.");
      }
    }

    this.draw();
  }

  join(game) {
    this.send({ action: "join", game });
  }

  move(move) {
    this.showLoading("Waiting for turn.");
    this.state.turn = null;
    this.send({ action: "move", move });
    this.draw();
  }

  end(reason) {
    this.showMessage(reason);
    this.ws.close();
  }

  draw() {
    this.resize();
  }

  resize() {
    const { clientWidth, clientHeight } = this.elements.container;
    const viewport = {
      left: 0,
      top: 0,
      width: clientWidth,
      height: clientHeight,
    };
    for (const canvas of this.layers) {
      GameClient.resizeCanvas(canvas, viewport);
    }
    return viewport;
  }

  isMyTurn() {
    return this.state && this.state.turn == this.player;
  }

  getElementsById(mapping) {
    for (const [prop, id] of Object.entries(mapping)) {
      this.elements[prop] = document.getElementById(id);
    }
  }

  addLayer(id) {
    const index = Object.keys(this.layers).length;
    const { container } = this.elements;
    const canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.style.zIndex = index;
    canvas.classList.add("layer");
    container.appendChild(canvas);
    this.layers.push(canvas);
    this.elements[id] = canvas;
  }

  send(command) {
    console.log("sending to server:", command);
    this.ws.send(JSON.stringify(command));
  }

  showMessage(text) {
    this.hideDialogs();
    this.elements.messageText.innerHTML = text;
    this.elements.message.classList.remove("hide");
  }

  showLoading(text) {
    this.hideDialogs();
    this.startSpinner();
    this.elements.loadingText.innerHTML = text;
    this.elements.loading.classList.remove("hide");
  }

  startSpinner() {
    let tick = 11;
    clearInterval(this.spinnerInterval);
    this.spinnerInterval = setInterval(() => {
      tick += 1;
      if (tick > 11) tick = 0;
      this.elements.loadingSpinner.innerHTML = `&#1283${36 + tick};`;
    }, 100);
  }

  hideMessage() {
    this.elements.message.classList.add("hide");
  }

  hideLoading() {
    this.elements.loading.classList.add("hide");
    clearInterval(this.spinnerInterval);
  }

  hideDialogs() {
    this.hideMessage();
    this.hideLoading();
  }

  static clearCanvas(canvas, context) {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
  }

  static resizeCanvas(canvas, box) {
    const { width, height } = box;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
  }

  static trimBox(box, margin) {
    const trimmed = {
      top: box.top + margin.top,
      left: box.left + margin.left,
      width: box.width - margin.left - margin.right,
      height: box.height - margin.top - margin.bottom,
    };
    trimmed.bottom = trimmed.top + trimmed.height;
    trimmed.right = trimmed.left + trimmed.width;
    return trimmed;
  }

  // Returns dimensions for a rectangle with the same aspect ratio as
  // `child` that fits maximally in `parent`.
  static fitBox(parent, child) {
    let width, height;
    if (parent.width / parent.height < child.width / child.height) {
      height = Math.trunc(parent.width / child.width) * child.height;
      width = (height / child.height) * child.width;
      return { width, height };
    } else {
      width = Math.trunc(parent.height / child.height) * child.width;
      height = (width / child.width) * child.height;
    }
    return { width, height };
  }

  // Returns top value that centers `child` within `parent` vertically.
  static centerBoxVertical(parent, child) {
    return parent.top + Math.trunc(parent.height / 2 - child.height / 2);
  }

  // Returns left value that centers `child` within `parent` horizontally.
  static centerBoxHorizontal(parent, child) {
    return parent.left + Math.trunc(parent.width / 2 - child.width / 2);
  }
}
