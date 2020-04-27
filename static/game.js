const host = location.origin.replace(/^http/, "ws");
const ws = new WebSocket(host);

const main = document.getElementById("main");
const game = document.getElementById("game");

const loadingContainer = document.getElementById("loading");
const loadingText = document.getElementById("loading-text");
const loadingSpinner = document.getElementById("loading-spinner");

const messageContainer = document.getElementById("message");
const messageText = document.getElementById("message-text");
const messageActions = document.getElementById("message-actions");

let spinnerInterval;
let gamePiece;
let gameBoard;

function setText(el, lines) {
  if (!Array.isArray(lines)) {
    lines = [lines];
  }
  el.innerHTML = "";
  for (const line of lines) {
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(line));
    el.appendChild(p);
  }
}

function showLoading(lines) {
  setText(loadingText, lines);
  startSpinner();
  loadingContainer.classList.remove("hide");
}

function startSpinner() {
  let n = 11;
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

function showLinks(lines = [], actions = null) {
  setText(messageText, lines);
  messageActions.innerHTML = "";
  if (actions) {
    for (const action of actions) {
      const a = document.createElement("a");
      a.setAttribute("href", action.href);
      a.appendChild(document.createTextNode(action.text));
      messageActions.appendChild(a);
    }
  }
  messageContainer.classList.remove("hide");
}

function showInfo(lines) {
  setText(messageText, lines);
  messageActions.innerHTML = "";
  const a = document.createElement("a");
  a.setAttribute("href", "#");
  a.appendChild(document.createTextNode("okay"));
  a.addEventListener("click", (event) => {
    event.preventDefault();
    hideMessage();
  });
  messageContainer.classList.remove("hide");
}

function showCloseMessage(info) {
  showLinks(
    [info, "Would you like to start another game?"],
    [
      { text: "yes", href: "/game" },
      { text: "no", href: "/" },
    ]
  );
}

function hideDialog() {
  hideMessage();
  hideLoading();
}

function hideMessage() {
  messageContainer.classList.add("hide");
}

function showGame() {
  resizeGame();
  window.addEventListener("resize", resizeGame);
  game.classList.remove("hide");
}

function hideGame() {
  game.classList.add("hide");
  window.removeEventListener("resize", resizeGame);
}

function resizeGame() {
  const width = main.clientWidth;
  const height = main.clientHeight;
  const padding = 100;
  const size = (width >= height ? height : width) - padding;
  game.style.width = `${size}px`;
  game.style.height = `${size}px`;
}

function resetBoard() {
  gameBoard = [];
  for (let row = 0; row < 3; row++) {
    gameBoard.push([]);
    for (let col = 0; col < 3; col++) {
      gameBoard[row][col] = "";
    }
  }
}

function startGame() {
  resetBoard();
  refreshBoard();
  hideLoading();
  showGame();
}

function getCell(row, col) {
  return document.getElementById(`cell-${row}${col}`);
}

function refreshBoard() {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const piece = gameBoard[row][col];
      const cell = getCell(row, col);
      cell.textContent = piece;
      if (piece) {
        cell.classList.remove("playable");
        cell.removeEventListener("click", onCellClick);
      } else {
        cell.classList.add("playable");
        cell.addEventListener("click", onCellClick);
      }
    }
  }
}

function onCellClick(event) {
  disableBoard();
  showWaiting();
  const cell = event.target;
  cell.classList.remove("playable");
  cell.removeEventListener("click", onCellClick);
  const s = cell.id.split("-")[1];
  const row = +s[0];
  const col = +s[1];
  console.log(`sending move: row ${row}, column ${col}`);
  send({ action: "move", move: { row, col } });
}

function send(data) {
  ws.send(JSON.stringify(data));
}

function setMove(move) {
  const { row, col } = move;
  gameBoard[row][col] = move.piece;
  refreshBoard();
}

function playTurn() {
  hideLoading();
  refreshBoard();
}

function getCells() {
  return document.querySelectorAll(".cell");
}

function disableBoard() {
  for (const cell of getCells()) {
    cell.classList.remove("playable");
  }
}

function showWaiting() {
  showLoading("Waiting for turn.");
}

function waitTurn() {
  showWaiting();
  disableBoard();
}

window.addEventListener("load", () => {
  showLoading("Waiting for opponent.");
});

ws.addEventListener("message", (event) => {
  const json = JSON.parse(event.data);
  console.log(json);
  switch (json.action) {
    case "start":
      gamePiece = json.piece;
      startGame();
      break;
    case "move":
      setMove(json.move);
      break;
    case "play":
      playTurn();
      break;
    case "wait":
      waitTurn();
      break;
    default:
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
  hideDialog();
  showCloseMessage("Lost connection to server!");
  hideGame();
});
