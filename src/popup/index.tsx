/// <reference path="../types/globals.d.ts" />
import { SonoraApp } from "./app/SonoraApp";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado.");

try {
  ReactDOM.render(<SonoraApp />, root);
} catch (error) {
  const message = error instanceof Error ? error.message : "Falha desconhecida ao iniciar a interface.";
  root.innerHTML = `
    <main class="app bootstrap-error">
      <h1>Não foi possível abrir a Sonora</h1>
      <p>${message.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character)}</p>
      <p>Recarregue a extensão em <strong>chrome://extensions</strong>.</p>
    </main>
  `;
  console.error("Sonora: falha ao montar o popup.", error);
}
