const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();

const db = require("./config/db");
const route = require("./routes");
const app = express();

const PORT = process.env.PORT || 8082;
db.connect();
app.use(
  cors({
    origin: "http://localhost:8080", // Đảm bảo đúng cổng của frontend
    credentials: true, // Cho phép gửi cookie qua cross-origin
  })
);
app.use(cookieParser());
app.use(express.json());

//Routes
route(app);

app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
