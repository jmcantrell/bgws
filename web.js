const app = require("./server/app");
const throng = require("throng");
const numCPUs = require("os").cpus().length;
const workers = process.env.WEB_CONCURRENCY || numCPUs;

throng({ workers }, () => {
  app.startServer();
});
