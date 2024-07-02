const express = require("express");
const path = require('path');
const http = require('http');
const app = express();
const server = http.createServer(app);
var cors = require('cors');
const connectDB = require("./config/db")
connectDB();
app.use(cors());

const PORT =  3004;
server.listen(PORT, () => {
  console.log('server started on port' + PORT)
});

module.exports = server;
