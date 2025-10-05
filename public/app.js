const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const uploadResult = document.getElementById("uploadResult");
const downloadForm = document.getElementById("downloadForm");

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
    uploadFile(file);
    animateAbsorb();
  }
});

// 👉 Cuando el usuario selecciona archivo manualmente
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    uploadFile(file);
    animateAbsorb();
  }
});

// Función para subir el archivo al servidor
async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  uploadResult.textContent = "Tu código es: " + data.code + " (válido por 5 minutos)";
}

// Función animación de absorción
function animateAbsorb() {
  dropZone.style.transform = "scale(0.9)";
  setTimeout(() => {
    dropZone.style.transform = "scale(1)";
  }, 200);
}

// 👉 Formulario de descarga (ya estaba)
downloadForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("code").value.trim();
  window.location.href = "/download/" + code;
});
