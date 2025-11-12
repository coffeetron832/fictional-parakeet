(function () {
  const pixelTrail = document.createElement('div');
  pixelTrail.style.position = 'fixed';
  pixelTrail.style.inset = '0';
  pixelTrail.style.pointerEvents = 'none';
  pixelTrail.style.zIndex = '9999';
  document.body.appendChild(pixelTrail);

  // Detectar tamaño de pantalla
  const pixelSize = window.innerWidth < 768 ? 8 : 12;
  const fadeDuration = 500; // ms

  document.addEventListener('mousemove', (e) => {
    const pixel = document.createElement('div');
    pixel.style.position = 'absolute';
    pixel.style.left = e.clientX + 'px';
    pixel.style.top = e.clientY + 'px';
    pixel.style.width = pixelSize + 'px';
    pixel.style.height = pixelSize + 'px';
    pixel.style.backgroundColor = '#fff';
    pixel.style.opacity = '1';
    pixel.style.transform = 'translate(-50%, -50%)';
    pixel.style.borderRadius = '2px';
    pixelTrail.appendChild(pixel);

    // Desvanece y elimina el pixel
    setTimeout(() => {
      pixel.style.transition = `opacity ${fadeDuration}ms ease-out`;
      pixel.style.opacity = '0';
      setTimeout(() => pixel.remove(), fadeDuration);
    }, 0);
  });
})();
