// Runs before any module loads, so lib/db connects to this worker's database.
const { workerUrl } = require("./urls");

process.env.DATABASE_URL = workerUrl(process.env.JEST_WORKER_ID ?? "1");
