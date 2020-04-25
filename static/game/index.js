const host = location.origin.replace(/^http/, "ws");
const ws = new WebSocket(host);

ws.addEventListener("message", (message) => {
  console.log(message.data);
});

ws.addEventListener("open", () => {
  console.log("websocket connection opened");
});

ws.addEventListener("error", (error) => {
  console.error("websocket error: ", error);
});

ws.addEventListener("close", () => {
  console.log("websocket connection closed");
});
