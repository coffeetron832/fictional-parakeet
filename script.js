// script.js
const input = document.getElementById('inputText');
const btn = document.getElementById('sendBtn');
const fallingArea = document.getElementById('fallingArea');

// función glitch estética
function glitchify(text) {
  const symbols = ['#','%','&','@','*','+','/','?','¡','!'];
  return text.split('').map(ch => {
    if (ch === ' ') return ' ';
    return symbols[Math.floor(Math.random() * symbols.length)];
  }).join('');
}

// cambia el texto mientras se escribe
input.addEventListener('input', () => {
  const original = input.value;
  input.style.color = '#333'; // "ocultamos" el original
  input.setAttribute('data-glitch', glitchify(original));
});

// enviar al hoyo
btn.addEventListener('click', () => {
  const text = input.value;
  if (!text.trim()) return;

  const falling = document.createElement('div');
  falling.className = 'fallingText';
  falling.innerText = glitchify(text);

  fallingArea.appendChild(falling);

  // eliminar tras animación
  falling.addEventListener('animationend', () => {
    falling.remove();
  });

  input.value = '';
  input.removeAttribute('data-glitch');
});
