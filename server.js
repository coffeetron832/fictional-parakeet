import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import mime from "mime-types";

const app = express();

// Límites y umbrales
const MAX_UPLOAD_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
const BIG_FILE_THRESHOLD = 512 * 1024 * 1024; // 512 MB
const SHORT_EXPIRE_SECONDS = 3 * 60; // 3 minutos (para >= 512 MB)
const LONG_EXPIRE_SECONDS = 90; // 1 minuto 30 segundos (para < 512 MB)

// 📌 Configuración de multer con límite de 1 GB
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_UPLOAD_BYTES }
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
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Archivo no permitido por seguridad." });
  }

  // Determinar expiración según tamaño
  const size = req.file.size;
  const expiresSeconds = size >= BIG_FILE_THRESHOLD ? SHORT_EXPIRE_SECONDS : LONG_EXPIRE_SECONDS;
  const expiresAt = Date.now() + expiresSeconds * 1000;

  // ⚡ Generar código único
  const code = crypto.randomBytes(3).toString("hex");

  // Guardar metadata del archivo
  filesMap[code] = {
    filename: req.file.originalname,
    path: req.file.path,
    expiresAt,
    size,
    mimetype: req.file.mimetype || mime.lookup(originalExt) || "application/octet-stream"
  };

  res.json({ code, expiresIn: expiresSeconds });
});

// Manejo de errores de multer (por ejemplo archivo muy grande)
app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `Archivo demasiado grande. Límite: ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` });
  }
  // si no es un error de multer, pasar al siguiente manejador
  return next(err);
});

// 📋 Consultar info de archivo antes de descargar
app.get("/file/:code", (req, res) => {
  const code = req.params.code;
  const fileData = filesMap[code];
  if (!fileData) {
    return res.status(404).json({ error: "Código inválido o archivo no encontrado." });
  }

  const remainingTime = fileData.expiresAt - Date.now();
  if (remainingTime <= 0) {
    // si ya expiró, eliminarlo y avisar
    fs.unlink(fileData.path, () => {});
    delete filesMap[code];
    return res.status(410).json({ error: "El archivo ha expirado." });
  }

  res.json({
    filename: fileData.filename,
    size: fileData.size,
    mimetype: fileData.mimetype,
    expiresIn: Math.floor(remainingTime / 1000) // en segundos
  });
});

// 📥 Descargar archivo con branding "paraleel" (stream desde disco)
app.get("/download/:code", (req, res) => {
  const code = req.params.code;
  const fileData = filesMap[code];
  if (!fileData) {
    return res.status(404).send("Código inválido o archivo eliminado.");
  }

  const remainingTime = fileData.expiresAt - Date.now();
  if (remainingTime <= 0) {
    fs.unlink(fileData.path, () => {});
    delete filesMap[code];
    return res.status(410).send("El archivo ha expirado.");
  }

  // Agregar sufijo al nombre del archivo antes de enviarlo
  const ext = path.extname(fileData.filename);
  const base = path.basename(fileData.filename, ext);
  const brandedName = `${base}_paraleel${ext}`;

  // Stream para descargar sin cargar en memoria
  const stat = fs.statSync(fileData.path);
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Content-Type", fileData.mimetype);
  res.setHeader("Content-Disposition", `attachment; filename="${brandedName}"`);
  const readStream = fs.createReadStream(fileData.path);
  readStream.pipe(res);
});

// 🧹 Limpieza automática cada 30 segundos
setInterval(() => {
  const now = Date.now();
  for (const code in filesMap) {
    if (Object.prototype.hasOwnProperty.call(filesMap, code)) {
      if (filesMap[code].expiresAt < now) {
        try {
          fs.unlink(filesMap[code].path, () => {});
        } catch (e) {
          // ignore unlink errors
        }
        delete filesMap[code];
      }
    }
  }
}, 30 * 1000);

app.listen(8080, () =>
  console.log(`🚀 Servidor en http://localhost:8080`)
);
