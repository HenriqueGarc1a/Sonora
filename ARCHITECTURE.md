# Arquitetura da Sonora

## Popup

`useSonoraController` coordena a inicialização, mas cada grupo de regras possui um hook próprio:

- `useAudioSettings`: controles, presets aplicados e sincronização de áudio.
- `useCustomPresets`: criação, exclusão e estado do diálogo.
- `usePanelLayout`: ordem, drag-and-drop e painéis flutuantes.
- `useThemeSettings`: paleta, aplicação imediata e persistência.
- `useToast`: mensagens temporárias.

A renderização está separada entre componentes comuns, controles, configurações e diálogos.

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

O TypeScript primeiro gera CommonJS em `.build/`. `scripts/build.mjs` resolve as dependências locais e monta bundles IIFE. A pasta temporária é removida ao final.
