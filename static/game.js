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

let gameBoard;

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

function showLinks(text, actions = null) {
  hideDialogs();
  messageText.innerHTML = text;
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

function showWaitingForTurn() {
  showLoading("Waiting for turn.");
}

function showCloseMessage(text) {
  text = `${text}<br>Would you like to start another game?`;
  showLinks(text, [
    { text: "yes", href: "/game" },
    { text: "no", href: "/" },
  ]);
}

function hideDialogs() {
  hideMessage();
  hideLoading();
}

function hideMessage() {
  messageContainer.classList.add("hide");
}

function showGame() {
  hideDialogs();
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

function getCell(row, column) {
  return document.getElementById(`cell-${row}${column}`);
}

function updateBoard(turn) {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const piece = gameBoard[row][column];
      const cell = getCell(row, column);
      if (piece) {
        cell.textContent = piece;
        cell.classList.remove("playable");
        cell.removeEventListener("click", onCellClick);
      } else {
        cell.textContent = "";
        if (turn) {
          cell.classList.add("playable");
          cell.addEventListener("click", onCellClick);
        }
      }
    }
  }
}

function onCellClick(event) {
  updateBoard(false);
  showWaitingForTurn();
  const cell = event.target;
  cell.classList.remove("playable");
  cell.removeEventListener("click", onCellClick);
  const s = cell.id.split("-")[1];
  const row = +s[0];
  const column = +s[1];
  send({ action: "move", move: { row, column } });
}

function send(command) {
  console.log(`sending to server:`, command);
  ws.send(JSON.stringify(command));
}

function updateGame(update) {
  const { board, finished, winner, won, turn } = update;
  gameBoard = board;
  updateBoard(turn);
  showGame();
  if (finished) {
    if (winner) {
      if (won) {
        showCloseMessage("You won!");
      } else {
        showCloseMessage("You lost.");
      }
    } else {
      showCloseMessage("It's a draw!");
    }
  } else if (!turn) {
    showLoading("Waiting for turn.");
  }
}

window.addEventListener("load", () => {
  showLoading("Waiting for opponent.");
});

ws.addEventListener("message", (event) => {
  const command = JSON.parse(event.data);
  console.log("received from server:", command);
  switch (command.action) {
    case "update":
      updateGame(command.update);
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
  showCloseMessage("Lost connection to server!");
  hideGame();
});
