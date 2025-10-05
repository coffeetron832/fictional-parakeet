// script.js
const input = document.getElementById('inputText');
const btn = document.getElementById('sendBtn');
const fallingArea = document.getElementById('fallingArea');

let originalText = "";

// función glitch estética
function glitchify(text) {
  const symbols = ['#','%','&','@','*','+','/','?','¡','!','^'];
  return text.split('').map(ch => {
    if (ch === ' ') return ' ';
    return symbols[Math.floor(Math.random() * symbols.length)];
  }).join('');
}

// interceptamos la escritura
input.addEventListener('input', (e) => {
  // guardamos lo real
  originalText = input.value;

  // reemplazamos lo que se ve por la versión glitch
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = glitchify(originalText);

  // mantenemos posición del cursor
  input.setSelectionRange(start, end);
});

// enviar al hoyo
btn.addEventListener('click', () => {
  if (!originalText.trim()) return;

  const falling = document.createElement('div');
  falling.className = 'fallingText';
  falling.innerText = glitchify(originalText);

  fallingArea.appendChild(falling);

  falling.addEventListener('animationend', () => {
    falling.remove();
  });

  // limpiar
  originalText = "";
  input.value = "";
});
