const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const uploadResult = document.getElementById("uploadResult");
const downloadForm = document.getElementById("downloadForm");

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

// 👉 Confirmación antes de descargar
downloadForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("code").value.trim();

  if (!code) return;

  if (confirm(`¿Seguro que quieres descargar el archivo con código: ${code}?`)) {
    window.location.href = "/download/" + code;
  }
});
