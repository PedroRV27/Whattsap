const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Almacenar usuarios conectados
const users = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('login', (userData) => {
        // Guardar los datos del usuario
        users[socket.id] = { ...userData };
        // Notificar a todos los clientes sobre el nuevo usuario conectado
        io.emit('userConnected', userData);
        // Enviar la lista de usuarios conectados al nuevo usuario
        socket.emit('connectedUsers', Object.values(users));
    });

    socket.on('disconnect', () => {
        if (users[socket.id]) {
            const disconnectedUser = users[socket.id];
            delete users[socket.id];
            // Notificar a todos los clientes sobre el usuario que se desconectó
            io.emit('userDisconnected', disconnectedUser);
        }
    });

    socket.on('typing', (isTyping) => {
        // Manejar el evento de escritura
        if (isTyping) {
            // Emitir el evento 'userTyping' a todos los clientes excepto al usuario que está escribiendo
            socket.broadcast.emit('userTyping', users[socket.id]);
        } else {
            // Si el usuario deja de escribir, limpiar el estado de escritura
            io.emit('userTyping', null);
        }
    });
    
    socket.on('chatMessage', (message) => {
        // Reenviar el mensaje a todos los clientes
        io.emit('chatMessage', { user: users[socket.id], message });
    });

    socket.on('fileShared', (data) => {
        // Emitir el archivo compartido a todos los clientes excepto al remitente
        socket.broadcast.emit('fileShared', { data: data.data, name: data.name, type: data.type, user: users[socket.id] });
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
