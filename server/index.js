const express = require("express");

const app = express();
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Article Share backend running");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
