import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Endpoint to validate a password
app.post("/api/check-password", async (req, res) => {
  const { password } = req.body;
  const [rows] = await connection.execute(
    "SELECT * FROM access_passwords WHERE password = ?",
    [password],
  );

  if ((rows as any).length === 0) {
    return res.status(401).send("Invalid password");
  }

  res.send("Password accepted");
});

app.listen(3001, () => console.log("Auth API running on port 3001"));
