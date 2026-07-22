# Sonora — Controle de Áudio

Extensão Chrome Manifest V3 que processa localmente o áudio da aba atual. A interface do popup foi migrada para **React + TypeScript**.

## Recursos

- Volume de 0% a 300%, velocidade de 0,5× a 2× e preservação de pitch.
- Equalizador de graves, médios e agudos, reverb, largura estéreo e balanço.
- Modo noturno, presets nativos e presets personalizados.
- Painéis reordenáveis e controles flutuantes sobre a página.
- Configurações com abas **Geral** e **Estilos**.
- Tema com 5 cores base: fundo, superfície, texto, destaque e erro.
- Preferências persistidas em `chrome.storage.local`.

O áudio permanece no navegador e não é enviado para servidores.

## Desenvolvimento

Requer Node.js e TypeScript.

```bash
npm install
npm run typecheck
npm run build
```

O build pronto para carregar no Chrome é gerado em `dist/`.

Para gerar também um ZIP da extensão:

```bash
npm run zip
```

## Instalar no Chrome

1. Execute `npm run build`.
2. Abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `dist/`.

## Estrutura

- `src/popup/popup.tsx`: aplicação React tipada.
- `src/popup/theme.ts`: modelo e aplicação da paleta.
- `src/popup/styles.css`: estilos do popup.
- `src/runtime/`: service worker e controlador injetado nas páginas.
- `src/audio/`: documento offscreen e pipeline Web Audio.
- `src/shared/theme.js`: tema usado pelos scripts injetados e pelo service worker.
- `scripts/build.mjs`: compilação e montagem da extensão em `dist/`.

## Correção do tema

Os scripts de runtime não usam mais `SonoraTheme` como identificador solto. Eles resolvem a API pelo `globalThis`, evitando o erro que ocorria em:

```js
let uiTheme = SonoraTheme.normalize();
```

## Dependências empacotadas

O React e o React DOM usados pelo popup ficam dentro do pacote da extensão, sem carregamento remoto, conforme exigido pelo Manifest V3. Consulte `THIRD_PARTY_LICENSES.md`.
