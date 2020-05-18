import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const metadata = JSON.parse(readFileSync(join(__dirname, "games", "metadata.json")));

export async function load() {
  const games = [];

  for (const id of Object.keys(metadata)) {
    const filename = join(__dirname, "games", `${id}.js`);
    const module = await import(filename);
    const game = new module.default();
    Object.assign(game, metadata[id]);
    games.push(game);
  }

  games.sort((a, b) => a.name.localeCompare(b.name));
  return new Map(games.map((game) => [game.id, game]));
}
