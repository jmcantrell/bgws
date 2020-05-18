import { cpus } from "os";
import throng from "throng";
import { startServer } from "./server/app.js";

const numCPUs = cpus().length;
const workers = process.env.WEB_CONCURRENCY || numCPUs;

throng({ workers }, () => {
  startServer();
});
