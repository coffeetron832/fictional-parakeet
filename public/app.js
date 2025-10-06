const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const uploadResult = document.getElementById("uploadResult");
const downloadForm = document.getElementById("downloadForm");

// 📌 Info del archivo para verificación previa
const fileInfoBox = document.getElementById("fileInfo");
const infoName = document.getElementById("infoName");
const infoSize = document.getElementById("infoSize");
const infoType = document.getElementById("infoType");
const infoExpire = document.getElementById("infoExpire");
const confirmDownloadBtn = document.getElementById("confirmDownload");

// Extensiones peligrosas (igual que en el server)
const blockedExtensions = [".exe", ".bat", ".js", ".sh", ".cmd", ".msi", ".com", ".scr", ".pif"];

// 📏 Límite de 128 MB
const MAX_FILE_SIZE = 128 * 1024 * 1024;

// 👉 Click en el hoyo abre el selector de archivos
dropZone.addEventListener("click", () => fileInput.click());

// 👉 Cuando el usuario arrastra un archivo encima
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

// 👉 Cuando el archivo sale del área
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

// 👉 Cuando el archivo se suelta en el hoyo
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) {
    validateAndUpload(file);
  }
});

// 👉 Cuando el usuario selecciona archivo manualmente
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    validateAndUpload(file);
  }
});

// ✅ Validación antes de subir
function validateAndUpload(file) {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (blockedExtensions.includes(ext)) {
    uploadResult.textContent = `❌ Archivo bloqueado por seguridad: ${ext}`;
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    uploadResult.textContent = `❌ El archivo excede el límite de ${(MAX_FILE_SIZE / 1024 / 1024)} MB.`;
    return;
  }

  if (!confirm(`¿Seguro que quieres subir "${file.name}" (${(file.size / 1024).toFixed(1)} KB)?`)) {
    return;
  }

  uploadFile(file);
  animateFileDrop();
}

// 👉 Subir el archivo al servidor
async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (data.error) {
      uploadResult.textContent = "❌ " + data.error;
    } else {
      uploadResult.textContent = "✅ Tu código es: " + data.code + " (válido por 5 minutos)";
    }
  } catch (err) {
    uploadResult.textContent = "❌ Error al subir el archivo. Intenta de nuevo.";
  }
}

// 🔽 Animación del archivo cayendo en el pozo
function animateFileDrop() {
  const fileIcon = document.createElement("div");
  fileIcon.className = "falling-file";
  fileIcon.textContent = "📄";
  dropZone.appendChild(fileIcon);

  fileIcon.addEventListener("animationend", () => {
    fileIcon.remove();
  });
}

// 👉 Verificar archivo antes de descargar
downloadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("code").value.trim();

  if (!code) return;

  try {
    const res = await fetch(`/file/${code}`);
    const data = await res.json();

    if (data.error) {
      alert("❌ " + data.error);
      fileInfoBox.style.display = "none";
      return;
    }

    // Mostrar info en el panel
    infoName.textContent = data.filename;
    infoSize.textContent = (data.size / 1024).toFixed(1) + " KB";
    infoType.textContent = data.mimetype || "Desconocido";

    // Expiración (segundos restantes) viene como data.expiresIn
    let remaining = data.expiresIn;
    infoExpire.textContent = remaining + " segundos";

    // Iniciar contador regresivo
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        infoExpire.textContent = "Expirado";
        confirmDownloadBtn.disabled = true;
      } else {
        infoExpire.textContent = remaining + " segundos";
      }
    }, 1000);

    fileInfoBox.style.display = "block";
    confirmDownloadBtn.disabled = false;

    // Guardamos el código actual en el botón confirmar
    confirmDownloadBtn.dataset.code = code;

  } catch (err) {
    alert("❌ Error al verificar el archivo.");
  }
});

// 👉 Confirmar descarga después de verificar
confirmDownloadBtn.addEventListener("click", () => {
  const code = confirmDownloadBtn.dataset.code;
  if (!code) return;

  if (confirm(`¿Deseas descargar el archivo con código: ${code}?`)) {
    window.location.href = "/download/" + code;
  }
});
