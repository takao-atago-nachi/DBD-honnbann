const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};
let killerId = null;

io.on('connection', (socket) => {
  console.log('プレイヤー接続:', socket.id);

  if (!killerId) {
    killerId = socket.id;
    players[socket.id] = { id: socket.id, role: 'killer', x: 0, z: 0, isDowned: false };
  } else {
    players[socket.id] = { id: socket.id, role: 'survivor', x: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20, isDowned: false };
  }

  socket.emit('init', { id: socket.id, players });
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].z = data.z;
      socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, z: data.z });
    }
  });

  socket.on('attack', () => {
    if (socket.id !== killerId) return;
    const killer = players[killerId];
    if (!killer) return;

    Object.values(players).forEach((p) => {
      if (p.role === 'survivor' && !p.isDowned) {
        const dist = Math.hypot(p.x - killer.x, p.z - killer.z);
        if (dist < 2.5) {
          p.isDowned = true;
          io.emit('playerDowned', { id: p.id });
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('切断:', socket.id);
    delete players[socket.id];
    if (socket.id === killerId) killerId = null;
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});