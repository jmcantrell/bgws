const host = location.origin.replace(/^http/, "ws");
const ws = new WebSocket(host);

const main = document.getElementById("main");
const game = document.getElementById("game");

const loadingContainer = document.getElementById("loading");
const loadingText = document.getElementById("loading-text");
const loadingSpinner = document.getElementById("loading-spinner");

const messageContainer = document.getElementById("message");
const messageText = document.getElementById("message-text");
const messageOkay = document.getElementById("message-okay");

let spinnerInterval;

let state;

window.addEventListener("load", () => {
  showLoading("Waiting for opponent.");
  window.addEventListener("resize", resizeGame);
  resizeGame();
});

ws.addEventListener("message", (event) => {
  const command = JSON.parse(event.data);
  console.log("received from server:", command);
  switch (command.action) {
    case "update":
      updateGame(command.update);
      break;
    case "close":
      showMessage(command.reason);
      break;
  }
});

ws.addEventListener("open", () => {
  console.log("websocket connection opened");
});

ws.addEventListener("error", (error) => {
  console.error("websocket error: ", error);
});

ws.addEventListener("close", () => {
  console.log("websocket connection closed");
  showMessage("Lost connection to server!");
});

messageOkay.addEventListener("click", () => {
  hideMessage();
});

function showMessage(text) {
  hideDialogs();
  messageText.innerHTML = text;
  messageContainer.classList.remove("hide");
}

function showLoading(text) {
  hideDialogs();
  loadingText.innerHTML = text;
  startSpinner();
  loadingContainer.classList.remove("hide");
}

function startSpinner() {
  let n = 11;
  clearInterval(spinnerInterval);
  spinnerInterval = setInterval(() => {
    n += 1;
    if (n > 11) n = 0;
    loadingSpinner.innerHTML = `&#1283${36 + n};`;
  }, 100);
}

function hideLoading() {
  loadingContainer.classList.add("hide");
  clearInterval(spinnerInterval);
}

function hideDialogs() {
  hideMessage();
  hideLoading();
}

function hideMessage() {
  messageContainer.classList.add("hide");
}

function resizeGame() {
  const width = main.clientWidth;
  const height = main.clientHeight;
  const padding = 100;
  const size = (width >= height ? height : width) - padding;
  game.style.width = `${size}px`;
  game.style.height = `${size}px`;
}

function getCell(row, column) {
  return document.getElementById(`cell-${row}${column}`);
}

function removeEventListeners(cell) {
  cell.removeEventListener("click", onCellClick);
  cell.removeEventListener("mouseover", onCellMouseOver);
  cell.removeEventListener("mouseout", onCellMouseOut);
}

function addEventListeners(cell) {
  cell.addEventListener("click", onCellClick);
  cell.addEventListener("mouseover", onCellMouseOver);
  cell.addEventListener("mouseout", onCellMouseOut);
}

function updateBoard() {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const cell = getCell(row, column);
      const piece = state.board[row][column];
      cell.textContent = piece || "";
      if (!piece && state.turn) {
        cell.classList.add("playable");
        addEventListeners(cell);
      }
      else {
        cell.classList.remove("playable");
        removeEventListeners(cell);
      }
    }
  }
  if (state.winner) {
    for (const [row, column] of state.winner.line) {
      const cell = getCell(row, column);
      cell.classList.add("highlight");
    }
  }
}

function onCellClick(event) {
  showLoading("Waiting for turn.");
  const cell = event.target;
  cell.classList.remove("playable");
  cell.removeEventListener("click", onCellClick);
  const s = cell.id.split("-")[1];
  const row = +s[0];
  const column = +s[1];
  send({ action: "move", move: { row, column } });
}

function onCellMouseOver(event) {
  const cell = event.target;
  cell.textContent = state.piece;
}

function onCellMouseOut(event) {
  const cell = event.target;
  cell.textContent = "";
}

function send(command) {
  console.log(`sending to server:`, command);
  ws.send(JSON.stringify(command));
}

function updateGame(update) {
  state = update;
  updateBoard();
  if (state.finished) {
    if (state.winner) {
      if (state.won) {
        showMessage("You won!");
      } else {
        showMessage("You lost.");
      }
    } else {
      showMessage("It's a draw!");
    }
  } else {
    if (state.turn) {
      hideLoading();
    } else {
      showLoading("Waiting for turn.");
    }
  }
}
