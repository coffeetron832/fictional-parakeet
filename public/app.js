const uploadForm = document.getElementById("uploadForm");
const uploadResult = document.getElementById("uploadResult");
const downloadForm = document.getElementById("downloadForm");

// Subir archivo
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(uploadForm);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  uploadResult.textContent = "Tu código es: " + data.code + " (válido por 5 minutos)";
});

// Descargar archivo
downloadForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("code").value.trim();
  window.location.href = "/download/" + code;
});
