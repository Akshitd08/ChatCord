const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require('cors');
const formatMessage = require("./messages");
const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
} = require("./users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(cors());
// Set static folder
app.use(express.static(path.join(__dirname, "chat_app")));

app.get('/index.html', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
});
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
});

app.get('/chat.html', function (req, res) {
    res.sendFile(path.join(__dirname, 'chat.html'))
});
app.get('/main.js', function (req, res) {
    res.sendFile(path.join(__dirname, 'main.js'))
});

const botName = "ChatCord Bot";



// Run when client connects
io.on("connection", (socket) => {
    socket.on("joinRoom", ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

        // Broadcast when a user connects
        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        // Send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
        });
    });

    // Listen for chatMessage
    socket.on("chatMessage", (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit("message", formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                "message",
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: getRoomUsers(user.room),
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
