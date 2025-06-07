require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");  

const app = express();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/esp32_db';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());

app.use(express.json());

const usersRouter = require("./routes/users");
const robotRouter = require("./routes/robot");
const devicesRouter = require("./routes/devices");

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.use("/users", usersRouter);
app.use("/robot", robotRouter);
app.use("/devices", devicesRouter);

const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
