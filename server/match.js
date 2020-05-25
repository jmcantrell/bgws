import { v4 as uuid } from "uuid";

export function createMatch(game, players) {
  const match = {
    id: uuid(),
    game: game.id,
    start: Date.now(),
    players: [],
    moves: [],
    state: game.createState(),
  };

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    player.index = i;
    player.match = match.id;
    match.players.push(player.id);
  }

  return match;
}

export function addMove(game, match, player, move) {
  if (match.state.finished) {
    throw new Error("match already finished");
  }
  if (match.moves.length == 0 && player.index > 0) {
    throw new Error("only player one can move first");
  }
  if (match.moves.length > 0) {
    const last = match.moves[match.moves.length - 1];
    if (last.player == player.index) {
      throw new Error("player already moved");
    }
  }
  const { state } = match;

  game.setMove(state, player.index, move);

  move.player = player.index;
  match.moves.push(move);

  state.winner = game.getWinner(state, player.index, move);
  state.finished = Boolean(state.winner) || game.isDraw(state, player.index, move);

  const turn = (player.index + 1) % game.numPlayers;
  state.turn = state.finished ? null : turn;
}
