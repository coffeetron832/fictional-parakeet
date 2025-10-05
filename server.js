import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";

const app = express();
const upload = multer({ dest: "uploads/" });

let filesMap = {}; // { code: { filename, path, expiresAt } }

// Middleware para servir el frontend
app.use(express.static("public"));

// Subir archivo
app.post("/upload", upload.single("file"), (req, res) => {
  const code = crypto.randomBytes(3).toString("hex"); // código de 6 caracteres
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

  filesMap[code] = {
    filename: req.file.originalname,
    path: req.file.path,
    expiresAt
  };

  res.json({ code });
});

// Descargar archivo
app.get("/download/:code", (req, res) => {
  const fileData = filesMap[req.params.code];
  if (!fileData) return res.status(404).send("Código inválido o archivo eliminado.");

  res.download(fileData.path, fileData.filename);
});

// Limpieza automática cada minuto
setInterval(() => {
  const now = Date.now();
  for (let code in filesMap) {
    if (filesMap[code].expiresAt < now) {
      fs.unlink(filesMap[code].path, () => {});
      delete filesMap[code];
    }
  }
}, 60 * 1000);

app.listen(8080, () => console.log("🚀 Servidor en http://localhost:8080"));
