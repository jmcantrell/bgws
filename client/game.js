import * as canvas from "/lib/canvas.js";

export default class GameClientBase {
  constructor({ url, game }) {
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

    this.client = new WebSocket(url);

    this.client.addEventListener("error", (error) => {
      console.error("websocket error", error);
    });

    this.client.addEventListener("open", () => {
      console.log("websocket connection opened");
      this.showLoading("Waiting for opponent.");
      this.join(this.game.id);
    });

    this.client.addEventListener("message", (event) => {
      const command = JSON.parse(event.data);
      console.log("received from server:", command);
      switch (command.action) {
        case "update":
          this.player = command.player;
          return this.update(command.state);
        case "end":
          return this.end(command.reason);
        default:
          console.error("invalid command", command);
      }
    });

    this.client.addEventListener("close", () => {
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
    this.client.close();
  }

  draw() {
    this.resize();
  }

  resize() {
    const {
      clientWidth: width,
      clientHeight: height,
    } = this.elements.container;
    const viewport = { left: 0, top: 0, width, height };
    for (const layer of this.layers) {
      canvas.resize(layer, viewport);
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
    const layer = document.createElement("canvas");
    layer.id = id;
    layer.style.zIndex = index;
    layer.classList.add("layer");
    container.appendChild(layer);
    this.layers.push(layer);
    this.elements[id] = layer;
  }

  getContext(layer) {
    const context = layer.getContext("2d");
    const dpr = window.devicePixelRatio;
    // context.scale(dpr, dpr);
    canvas.clear(layer, context);
    return context;
  }

  send(command) {
    console.log("sending to server:", command);
    this.client.send(JSON.stringify(command));
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
}
