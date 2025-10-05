import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path from "path";

const app = express();

// 📌 Configuración de multer con límite de 128 MB
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 128 * 1024 * 1024 } // 128 MB
});

let filesMap = {}; // { code: { filename, path, expiresAt } }

// 🚫 Extensiones peligrosas (blacklist)
const blockedExtensions = [
  ".exe", ".bat", ".js", ".sh", ".cmd",
  ".msi", ".com", ".scr", ".pif"
];

// Middleware para servir el frontend
app.use(express.static("public"));

// Subir archivo
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se envió ningún archivo." });
  }

  const originalExt = path.extname(req.file.originalname).toLowerCase();

  // 🚫 Validar extensión
  if (blockedExtensions.includes(originalExt)) {
    fs.unlink(req.file.path, () => {}); // borrar archivo rechazado
    return res.status(400).json({ error: "Archivo no permitido por seguridad." });
  }

  // ⚡ Código único
  const code = crypto.randomBytes(3).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

  // Guardar metadata del archivo
  filesMap[code] = {
    filename: path.basename(req.file.originalname), // sanitizamos el nombre
    path: req.file.path,
    expiresAt
  };

  res.json({ code });
});

// Descargar archivo
app.get("/download/:code", (req, res) => {
  const fileData = filesMap[req.params.code];
  if (!fileData) {
    return res.status(404).send("Código inválido o archivo eliminado.");
  }

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

app.listen(8080, () =>
  console.log("🚀 Servidor en http://localhost:8080 (límite 128MB, extensiones peligrosas bloqueadas)")
);
