# Sonora — Controle de Áudio

Extensão Chrome Manifest V3 que processa localmente o áudio da aba atual. A interface utiliza **React + TypeScript**, e o código-fonte é separado por domínio.

## Recursos

- Volume de 0% a 300%, velocidade de 0,5× a 2× e preservação de pitch.
- Equalizador, reverb, largura estéreo, balanço e modo noturno.
- Presets nativos e personalizados.
- Painéis reordenáveis e controles flutuantes sobre a página.
- Configurações com abas **Geral** e **Estilos**.
- Tema com 5 cores base: fundo, superfície, texto, destaque e erro.
- Preferências persistidas em `chrome.storage.local`.

O áudio permanece no navegador e não é enviado para servidores.

## Desenvolvimento

```bash
npm install
npm run typecheck
npm run build
```

O build pronto para carregar no Chrome é gerado em `dist/`.

```bash
npm run zip
```

O comando acima também gera um ZIP instalável.

## Instalar no Chrome

1. Execute `npm run build`.
2. Abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `dist/`.

## Organização do código

```text
src/
├── shared/                 # Tipos, constantes, tema, normalização e formatação
├── popup/
│   ├── app/                # Componente raiz
│   ├── components/
│   │   ├── common/         # Cabeçalho, rodapé, marca e ícones
│   │   ├── controls/       # Painéis e controles de áudio
│   │   ├── dialogs/        # Diálogos
│   │   └── settings/       # Abas e cartões de configurações
│   ├── hooks/              # Estado e regras da interface
│   ├── services/           # Comunicação com o service worker
│   └── styles/             # CSS separado por área
├── background/             # Captura, storage, presets, layout e roteamento
├── content/
│   ├── playback/           # Controle de velocidade e pitch da mídia
│   └── floating/           # Painéis flutuantes injetados nas páginas
├── offscreen/              # Sessão de captura e grafo Web Audio
├── audio/                  # HTML offscreen e AudioWorklet
└── types/                  # Declarações globais do Chrome e React
```

Nenhum arquivo de lógica do código-fonte passa de aproximadamente 170 linhas. O build reúne os módulos apenas onde o Chrome exige um único script:

- `dist/src/popup/popup.js`
- `dist/src/runtime/background.js`
- `dist/src/runtime/content.js`
- `dist/src/audio/offscreen.js`

## TypeScript 6

A configuração não usa mais `module: "None"` nem `outFile`. Essas opções estavam causando os avisos de descontinuação. O projeto usa módulos modernos durante o desenvolvimento e um empacotador simples do próprio projeto para produzir os scripts finais.

## Dependências empacotadas

React e React DOM ficam dentro do pacote da extensão, sem CDN ou código remoto. Consulte `THIRD_PARTY_LICENSES.md`.
