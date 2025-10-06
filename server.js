import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import mime from "mime-types";

const app = express();

// 📌 Configuración de multer con límite de 128 MB
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 128 * 1024 * 1024 } // 128 MB
});

// Mapa de archivos activos
let filesMap = {}; 
// Estructura: { code: { filename, path, expiresAt, size, mimetype } }

// 🚫 Extensiones peligrosas (blacklist)
const blockedExtensions = [
  ".exe", ".bat", ".js", ".sh", ".cmd",
  ".msi", ".com", ".scr", ".pif"
];

// Middleware para servir frontend
app.use(express.static("public"));

// 📤 Subir archivo
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se envió ningún archivo." });
  }

  const originalExt = path.extname(req.file.originalname).toLowerCase();

  // 🚫 Validar extensión peligrosa
  if (blockedExtensions.includes(originalExt)) {
    fs.unlink(req.file.path, () => {}); // eliminar archivo rechazado
    return res.status(400).json({ error: "Archivo no permitido por seguridad." });
  }

  // ⚡ Generar código único
  const code = crypto.randomBytes(3).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

  // Guardar metadata del archivo
  filesMap[code] = {
    filename: req.file.originalname, // mantener nombre original
    path: req.file.path,
    expiresAt,
    size: req.file.size,
    mimetype: req.file.mimetype || mime.lookup(originalExt) || "application/octet-stream"
  };

  res.json({ code });
});

// 📋 Consultar info de archivo antes de descargar
app.get("/file/:code", (req, res) => {
  const fileData = filesMap[req.params.code];
  if (!fileData) {
    return res.status(404).json({ error: "Código inválido o archivo no encontrado." });
  }

  const remainingTime = fileData.expiresAt - Date.now();
  if (remainingTime <= 0) {
    // si ya expiró, eliminarlo y avisar
    fs.unlink(fileData.path, () => {});
    delete filesMap[req.params.code];
    return res.status(410).json({ error: "El archivo ha expirado." });
  }

  res.json({
    filename: fileData.filename,
    size: fileData.size,
    mimetype: fileData.mimetype,
    expiresIn: Math.floor(remainingTime / 1000) // en segundos
  });
});

// 📥 Descargar archivo con branding "paraleel"
app.get("/download/:code", (req, res) => {
  const fileData = filesMap[req.params.code];
  if (!fileData) {
    return res.status(404).send("Código inválido o archivo eliminado.");
  }

  const remainingTime = fileData.expiresAt - Date.now();
  if (remainingTime <= 0) {
    fs.unlink(fileData.path, () => {});
    delete filesMap[req.params.code];
    return res.status(410).send("El archivo ha expirado.");
  }

  // Agregar sufijo al nombre del archivo antes de enviarlo
  const ext = path.extname(fileData.filename);
  const base = path.basename(fileData.filename, ext);
  const brandedName = `${base}_paraleel${ext}`;

  res.download(fileData.path, brandedName);
});

// 🧹 Limpieza automática cada minuto
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
  console.log("🚀 Servidor en http://localhost:8080 (límite 128MB, extensiones bloqueadas, branding paraleel)")
);
