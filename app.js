require("dotenv").config();

const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const userRoute = require('./routes/userRoute');
const User = require('./models/userModel');

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

  await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' } })

  socket.on('disconnect', async function() {  // Fixed typo here
    console.log('User Disconnected');

    let userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' } })
  });
});

// Middleware for routes
app.use("/", userRoute);

const port = 3000;
server.listen(port, function() {
  console.log(`Server is running on port ${port}`);
});
