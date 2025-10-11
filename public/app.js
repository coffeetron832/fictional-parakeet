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

// 📌 Inputs del código (tipo OTP)
const codeInputs = document.querySelectorAll(".code-digit");

// Extensiones peligrosas (igual que en el server)
const blockedExtensions = [".exe", ".bat", ".js", ".sh", ".cmd", ".msi", ".com", ".scr", ".pif"];

// 📏 Límite en cliente: 1 GB (coincide con el servidor)
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB

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
    uploadResult.textContent = `❌ El archivo excede el límite de ${(MAX_FILE_SIZE / 1024 / 1024 / 1024)} GB.`;
    return;
  }

  if (!confirm(`¿Seguro que quieres subir "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)?`)) {
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
      // Si el servidor devuelve expiresIn lo usamos para mostrar el tiempo real
      const expiresSecs = data.expiresIn || (5 * 60);
      uploadResult.textContent = `✅ Tu código es: ${data.code.toUpperCase()} (expira en ${formatTimeShort(expiresSecs)})`;
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

// 📌 Manejo de inputs OTP (avanzar y retroceder)
codeInputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    // permitir solo un carácter (hex preferido)
    input.value = input.value.slice(0, 1).toLowerCase().replace(/[^0-9a-f]/g, "");
    if (input.value.length === 1 && idx < codeInputs.length - 1) {
      codeInputs[idx + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && idx > 0) {
      codeInputs[idx - 1].focus();
    }
  });
});

// ----------------- Expiración: formateo y control de contador -----------------
let countdownIntervalId = null;

function formatTimeLong(seconds) {
  // devuelve una frase como "Expira en: 1 min 30s" o "Expira en: 50 segundos"
  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
  } else {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `Expira en: ${mins} minuto${mins !== 1 ? "s" : ""}`;
    return `${mins} min ${secs}s`;
  }
}

function formatTimeShort(seconds) {
  // devuelve "1m30s", "50s", "2m"
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}m${secs}s`;
}

function startCountdown(initialSeconds) {
  // limpia contador previo
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  let remaining = initialSeconds;
  infoExpire.textContent = formatTimeLong(remaining);

  countdownIntervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      infoExpire.textContent = "Expirado";
      confirmDownloadBtn.disabled = true;
      // también ocultar infoBox si quieres:
      // fileInfoBox.style.display = "none";
    } else {
      infoExpire.textContent = formatTimeLong(remaining);
    }
  }, 1000);
}
// ---------------------------------------------------------------------------

// 👉 Verificar archivo antes de descargar
downloadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Construir el código completo
  const code = Array.from(codeInputs).map(i => i.value.trim()).join("").toLowerCase();

  if (code.length !== codeInputs.length) {
    alert("❌ Ingresa el código completo.");
    return;
  }

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
    const remaining = Number(data.expiresIn) || 0;
    if (remaining <= 0) {
      infoExpire.textContent = "Expirado";
      confirmDownloadBtn.disabled = true;
    } else {
      // mostrar con formato y comenzar contador
      startCountdown(remaining);
      confirmDownloadBtn.disabled = false;
      // Guardamos el código actual en el botón confirmar
      confirmDownloadBtn.dataset.code = code;
    }

    fileInfoBox.style.display = "block";

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

// 🌌 Modal de bienvenida
window.addEventListener("load", () => {
  const modal = document.getElementById("welcomeModal");
  const closeBtn = document.getElementById("closeModal");

  // Mostrar modal con un pequeño retardo
  setTimeout(() => modal.classList.add("show"), 300);

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });
});


const particleLayer = document.querySelector(".particle-layer");

function createSpiralParticle() {
  const particle = document.createElement("div");
  particle.classList.add("particle");

  // Aleatorizar duración y radio inicial
  const duration = 3 + Math.random() * 3;
  const radius = 40 + Math.random() * 30;

  particle.style.setProperty("--duration", duration + "s");
  particle.style.setProperty("--radius", radius + "px");

  particleLayer.appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, duration * 1000);
}

// Genera una partícula cada 200-300ms con variación
setInterval(() => {
  if (Math.random() < 0.8) createSpiralParticle();
}, 250);

