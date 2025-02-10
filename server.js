const express = require("express");
const path = require('path');
const http = require('http');
const authRoutes = require("./routes/auth.routes")
const employeeRoutes = require("./routes/employee.routes")
const app = express();
const bodyParser = require('body-parser');
const server = http.createServer(app);
var cors = require('cors');
const connectDB = require("./config/db")

connectDB();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/auth', authRoutes)
app.use('/api/employee', employeeRoutes)



const PORT = 5000;
server.listen(PORT, () => {
  console.log('server started on port' + PORT)
});

module.exports = server;
