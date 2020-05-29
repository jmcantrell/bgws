import glob from "glob";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function load() {
  const filenames = glob.sync(join(__dirname, "..", "lib", "games", "*.js"));
  const games = await Promise.all(filenames.map((f) => import(f)));
  games.sort((a, b) => a.name.localeCompare(b.name));
  return new Map(games.map((game) => [game.id, game]));
}
