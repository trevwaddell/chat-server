const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
const uuid = require("node-uuid");

const wss = new WebSocketServer({ port: 8181 });

const createClient = (id, ws, nickname) => ({ id, ws, nickname });

let clients = [];
let client_index = 1;

const wsSend = (type, client_uuid, nickname, message) => {
  clients.forEach(client => {
    const clientSocket = client.ws;
    if (clientSocket.readyState === 1) {
      console.log("made it here");
      clientSocket.send(
        JSON.stringify({ type, nickname, message, id: client_uuid })
      );
    }
  });
};

wss.on("connection", socket => {
  const client_uuid = uuid.v4();
  let nickname = `AnonUser${client_index}`;
  client_index += 1;
  clients = [...clients, createClient(client_uuid, socket, nickname)];
  console.log(`client ${client_uuid} connected`);

  const connect_message = `${nickname} has connected`;
  wsSend("notification", client_uuid, nickname, connect_message);

  const closeSocket = customMessage => {
    clients.forEach((client, index) => {
      if (client.id == client_uuid) {
        console.log(`client ${client_uuid} disconnected`);
        let disconnect_message;
        if (customMessage) {
          disconnect_message = customMessage;
        } else {
          disconnect_message = `${nickname} has disconnected`;
        }
        wsSend("notification", client_uuid, nickname, disconnect_message);
        clients.splice(index, 1);
      }
    });
  };

  socket.on("message", message => {
    if (message.indexOf("/nick") === 0) {
      const nickname_array = message.split(" ");
      if (nickname_array.length >= 2) {
        const prev_nickname = nickname;
        nickname = nickname_array[1];
        const nickname_message = `Client ${prev_nickname} changed to ${nickname}`;
        wsSend("nick_update", client_uuid, nickname, nickname_message);
      }
    } else {
      wsSend("message", client_uuid, nickname, message);
    }
  });

  socket.on("close", () => {
    closeSocket();
  });

  process.on("SIGINT", () => {
    console.log("Closing Things");
    closeSocket("Server has disconnected");
    process.exit();
  });
});
