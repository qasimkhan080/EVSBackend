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
const uploadRoutes = require("./routes/uplaod.routes")
const notificationRoutes = require("./routes/notification.routes")


connectDB();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/auth', authRoutes)
app.use('/api/employee', employeeRoutes)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/upload', uploadRoutes)
app.use('/api/notifications', notificationRoutes)



const PORT = 3001;
server.listen(PORT, () => {
  console.log('server started on port' + PORT)
});

module.exports = server;
