'use strict';

const tools = document.querySelector('.tools');
const copyButton = document.getElementById('copiar');
const manualCopy = document.getElementById('copia-manual');
const status = document.getElementById('aviso');

copyButton.addEventListener('click', async () => {
  const citation = document.getElementById('referencia').textContent.trim();
  const original = document.getElementById('original').href;
  const reference = citation + ' ' + original;
  try {
    await navigator.clipboard.writeText(reference);
    manualCopy.hidden = true;
    status.textContent = 'Referencia copiada con el enlace al original.';
  } catch {
    manualCopy.value = reference;
    manualCopy.hidden = false;
    manualCopy.focus();
    manualCopy.select();
    status.textContent = 'Referencia seleccionada. Usa la opción Copiar de tu dispositivo.';
  }
});

document.getElementById('imprimir').addEventListener('click', () => window.print());
tools.hidden = false;
