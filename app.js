const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
  console.log("connected");

  // if first player enters
  if (!players.white) {
    // its say if white is not there then create
    players.white = uniquesocket.id; // and make it equal it its id
    // and send back to that person means to that id
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    // if this also comes it can only see the game
    uniquesocket.emit("spectatorRole");
  }

  // means if someone leave the game from black and white not the spectator then game over
  uniquesocket.on("disconnect", function () {
    if (uniquesocket.id === players.white) {
      delete players.white;
    } else if (uniquesocket.id === players.black) {
      delete players.black;
    }
  });

  uniquesocket.on("move", (move) => {
    // from the frontend
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move); // chess.move() check if move is valid
      if (result) {
        // if its true
        currentPlayer = chess.turn();
        // then backend send to everyone
        io.emit("move", move);
        io.emit("boardState", chess.fen()); // next phase after the move (means how it looks )
      } else {
        console.log("Invalid move", move);
        uniquesocket.emit("Invalid move", move); // means send to that person only not to everyone
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("Invalid move", move);
    }
  });

  // Handleing player disconnection and game over
  uniquesocket.on("disconnect", () => {
    io.emit("gameOver", "A player has disconnected.");
  });
});

server.listen(3000, () => {
  console.log("listening on port...");
});
