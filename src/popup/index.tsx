/// <reference path="../types/globals.d.ts" />
import { SonoraApp } from "./app/SonoraApp";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado.");
ReactDOM.render(<SonoraApp />, root);
