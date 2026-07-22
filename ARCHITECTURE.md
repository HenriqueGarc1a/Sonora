# Arquitetura da Sonora

## Popup

O popup usa React 18 e é separado por responsabilidades:

- `app/`: componente raiz da interface.
- `components/`: cabeçalho, controles, configurações e diálogos.
- `controllers/`: estado e regras de áudio, tema, layout e presets.
- `services/`: comunicação com o service worker.
- `styles/`: CSS dividido por área da interface.

O ponto de entrada cria uma única raiz com `ReactDOM.createRoot` e renderiza `SonoraApp`.

## Background

O service worker é dividido em serviços pequenos:

- `capture.ts`: ciclo de captura da guia.
- `contentBridge.ts`: comunicação com o script injetado.
- `layout.ts`: posição e visibilidade dos painéis.
- `offscreen.ts`: gerenciamento do documento offscreen.
- `presets.ts`: presets personalizados.
- `storage.ts`: leitura e gravação normalizada.
- `router.ts`: roteamento das mensagens.

## Content script

A reprodução da página e os painéis flutuantes são independentes. O bundle final evita imports no contexto da página, mas o código-fonte permanece modular.

## Offscreen

O processamento Web Audio foi separado em:

- criação e destruição do grafo;
- aplicação dos parâmetros;
- sessão de captura;
- criação do impulso de reverb;
- roteamento das mensagens.

## Build

O TypeScript primeiro gera CommonJS em `.build/`. `scripts/build.mjs` resolve as dependências locais e monta bundles IIFE. A pasta temporária é removida ao final. Os builds de React 18 e React DOM 18 são copiados localmente para o popup, sem CDN.
