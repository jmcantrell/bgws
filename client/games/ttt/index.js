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

let state = null;
const emptyPiece = "-";

let spinnerInterval;

window.addEventListener("load", resizeBoard);
window.addEventListener("resize", resizeBoard);

ws.addEventListener("message", (event) => {
  const command = JSON.parse(event.data);
  console.log("received from server:", command);
  switch (command.action) {
    case "update":
      updateGame(command.state);
      break;
    case "end":
      showMessage(command.reason);
      state.turn = false;
      updateBoard();
      break;
  }
});

ws.addEventListener("open", () => {
  console.log("websocket connection opened");
  send({ action: "join", game: "ttt" });
  showLoading("Waiting for opponent.");
});

ws.addEventListener("error", (error) => {
  console.error("websocket error: ", error);
});

ws.addEventListener("close", () => {
  console.log("websocket connection closed");
  showMessage("Lost connection to server!");
  state.turn = false;
  updateBoard();
});

messageOkay.addEventListener("click", (event) => {
  event.preventDefault();
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

function resizeBoard() {
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

function getPiece(row, column) {
  const piece = state ? state.board[row][column] : null;
  return piece || emptyPiece;
}

function updateBoard() {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const cell = getCell(row, column);
      const piece = getPiece(row, column);
      cell.textContent = piece;
      if (piece == emptyPiece) {
        cell.classList.add("empty");
      } else {
        cell.classList.remove("empty");
      }
      if (piece == emptyPiece && state.turn) {
        cell.classList.add("playable");
        addEventListeners(cell);
      } else {
        cell.classList.remove("playable");
        removeEventListeners(cell);
      }
    }
  }
  resizeBoard();
}

function updateWinner(winner) {
  const outcome = winner.piece == state.piece ? "win" : "lose";
  const highlight = `highlight-${outcome}`;
  for (const [row, column] of winner.line) {
    const cell = getCell(row, column);
    cell.classList.add(highlight);
  }
}

function onCellClick(event) {
  event.preventDefault();
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
  cell.textContent = emptyPiece;
}

function send(command) {
  console.log(`sending to server:`, command);
  ws.send(JSON.stringify(command));
}

function updateGame(newState) {
  state = newState;

  const { finished, winner, turn, won } = state;

  updateBoard();

  if (finished) {
    if (winner) {
      updateWinner(winner);
      showMessage(won ? "You won!" : "You lost.");
    } else {
      showMessage("It's a draw!");
    }
  } else {
    if (turn) {
      hideLoading();
    } else {
      showLoading("Waiting for turn.");
    }
  }
}
