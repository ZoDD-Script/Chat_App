require("dotenv").config();

const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const userRoute = require('./routes/userRoute');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

// Create an instance of Express
const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URL);

// Create HTTP server with Express app
const server = http.createServer(app);

// Initialize Socket.IO with the server instance
const io = socketIO(server);

const usp = io.of('/user-namespace');

usp.on('connection', async function(socket) {
  console.log('User Connected');

  let userId = socket.handshake.auth.token;

  await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' } });

  // user broadcast online status
  socket.broadcast.emit('getOnlineUser', { user_id: userId });

  socket.on('disconnect', async function() {  // Fixed typo here
    console.log('User Disconnected');

    let userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' } });

    // user broadcast offline status
    socket.broadcast.emit('getOfflineUser', { user_id: userId });
  });

  //chattig implementation
  socket.on('newChat', function(data) {
    socket.broadcast.emit('loadNewChat', data);
  });

  // load old chats
  socket.on('existsChat', async function(data) {
    let chats = await Chat.find({ $or: [
      { sender_id: data.sender_id, receiver_id: data.receiver_id },
      { sender_id: data.receiver_id, receiver_id: data.sender_id },
    ] });

    socket.emit('loadChats', { chats: chats });
  });

  //delete chats
  socket.on('chatDeleted', function(id) {
    console.log("chat is ", id)
    socket.broadcast.emit('chatMessageDeleted', id);
  });
});

// Middleware for routes
app.use("/", userRoute);

const port = 3000;
server.listen(port, function() {
  console.log(`Server is running on port ${port}`);
});
