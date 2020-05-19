const WEBSOCKET_URL = location.origin.replace(/^http/, "ws");

export default class Game extends EventTarget {
  constructor(id) {
    super();
    this.id = id;
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

    this.state = null;
    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.addEventListener("error", (error) => {
      console.error("websocket error: ", error);
    });

    this.ws.addEventListener("open", () => {
      console.log("websocket connection opened");
      this.showLoading("Waiting for opponent.");
      this.send({ action: "join", game: this.id });
    });

    this.ws.addEventListener("message", (event) => {
      const command = JSON.parse(event.data);
      console.log("received from server:", command);
      switch(command.action) {
        case "update":
          return this.update(command.state);
        case "end":
          return this.end(command.reason);
        default:
          console.error("unknown command", command);
      }
    });

    this.ws.addEventListener("close", () => {
      console.log("websocket connection closed");
      this.showMessage("Server disconnected!");
      this.draw()
    });

    this.elements.messageOkay.addEventListener("click", (event) => {
      event.preventDefault();
      this.hideMessage();
    });
  }

  update(state) {
    this.state = state;

    const { player, finished, winner, next } = this.state;

    if (finished) {
      if (winner) {
        this.showMessage(winner.player == player ? "You won!" : "You lost.");
      } else {
        this.showMessage("It's a draw!");
      }
    } else {
      if (next == player) {
        this.hideLoading();
      } else {
        this.showLoading("Waiting for turn.");
      }
    }
  }

  end(reason) {
    this.showMessage(reason);
    this.state.next = null;
    this.ws.close();
  }

  draw() {
    this.resize();
  }

  resize() {
    const { container } = this.elements;
    const width = container.clientWidth;
    const height = container.clientHeight;
    for (const canvas of this.layers) {
      Game.resizeCanvas(canvas, width, height);
    }
    return { top: 0, left: 0, width, height };
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
    console.log(`sending to server:`, command);
    this.ws.send(JSON.stringify(command));
  }

  showMessage(text) {
    this.hideDialogs();
    this.elements.messageText.innerHTML = text;
    this.elements.message.classList.remove("hide");
  }

  showLoading(text) {
    this.hideDialogs();
    this.elements.loadingText.innerHTML = text;
    this.startSpinner();
    this.elements.loading.classList.remove("hide");
  }

  startSpinner() {
    let n = 11;
    clearInterval(this.spinnerInterval);
    this.spinnerInterval = setInterval(() => {
      n += 1;
      if (n > 11) n = 0;
      this.elements.loadingSpinner.innerHTML = `&#1283${36 + n};`;
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

  static resizeCanvas(canvas, width, height) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
  }

  static trimBox(box, margin) {
    return {
      top: box.top + margin.top,
      left: box.left + margin.left,
      width: box.width - margin.left - margin.right,
      height: box.height - margin.top - margin.bottom,
    };
  }

  // Returns dimensions for a rectangle with the same aspect ratio as
  // `child` that fits maximally in `parent`.
  static fitBox(parent, child) {
    if (parent.width / parent.height < child.width / child.height) {
      const height = Math.trunc(parent.width / child.width) * child.height;
      const width = (height / child.height) * child.width;
      return { width, height };
    } else {
      const width = Math.trunc(parent.height / child.height) * child.width;
      const height = (width / child.width) * child.height;
      return { width, height };
    }
  }

  // Returns coordinates that center `child` within `parent` vertically
  // and horizontally.
  static centerBox(parent, child) {
    return {
      top: parent.top + Math.trunc(parent.height / 2 - child.height / 2),
      left: parent.left + Math.trunc(parent.width / 2 - child.width / 2),
    };
  }
}
