const express = require("express");
const path = require('path');
const http = require('http');
const app = express();
const bodyParser = require('body-parser');
const server = http.createServer(app);
var cors = require('cors');
const connectDB = require("./config/db")
connectDB();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/company', require("./routes/company"))



const PORT =  3000;
server.listen(PORT, () => {
  console.log('server started on port' + PORT)
});

module.exports = server;
