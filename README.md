# Sonora — Controle de Áudio

Extensão Chrome Manifest V3 que processa localmente o áudio da aba atual.

## Recursos desta versão

- Captura e reprodução contínua do áudio da aba, mesmo com o popup fechado.
- Volume entre 0% e 300%, com limiter para reduzir estouros.
- Velocidade entre 0,5× e 2×, sincronizada com elementos `<audio>` e `<video>`.
- Opção para manter o pitch original ou deixá-lo acompanhar a velocidade.
- Equalizador de graves, médios e agudos.
- Reverb com mistura gradual entre som seco e processado.
- Largura estéreo entre mono, normal e ampliada.
- Balanço independente entre os canais esquerdo e direito.
- Modo noturno para aproximar sons baixos e controlar picos altos.
- Presets para diálogo, graves, cinema e audição durante a madrugada.
- Preset **Neutro** que restaura volume, velocidade, equalização, reverb e estéreo, deixando a preservação de pitch desligada.
- Atalhos para as velocidades mais usadas.

Todo o áudio permanece no navegador. A extensão não usa servidor nem envia gravações.

## Instalar no Chrome

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta (`songeditor`).
5. Fixe a extensão **Sonora** na barra do Chrome.

## Usar

1. Abra um site com áudio ou vídeo.
2. Clique no ícone da Sonora. A extensão ativa automaticamente nessa guia.
3. Ajuste os controles e feche o popup quando quiser; o processamento continua ativo.
4. Para ouvir o áudio sem ajustes, clique em **Neutro**. Esse preset também restaura o volume para 100%, a velocidade para 1× e desliga a preservação de pitch.
5. O processamento termina quando a guia é fechada.

O clique no ícone fornece a ação explícita exigida pelo Chrome para iniciar a captura. A versão atual processa uma guia por vez; abrir a Sonora em outra guia transfere o processamento para ela.

## Limitações conhecidas

- A velocidade depende de o site usar elementos HTML normais de áudio ou vídeo. Players totalmente personalizados podem ignorá-la.
- Algumas páginas internas do Chrome e conteúdos protegidos podem bloquear a captura ou a injeção do controle de velocidade.
- A largura acima de 100% pode evidenciar artefatos de gravações com estéreo artificial; nesse caso, volte para **Normal**.
- O modo noturno usa compressão dinâmica e pode alterar a sensação de impacto de músicas muito intensas.

## Estrutura

- `background.js`: coordena captura, permissões e estado.
- `offscreen.js`: mantém o pipeline Web Audio ativo em segundo plano.
- `stereo-width-processor.js`: controla a largura estéreo sem alterar o centro da mixagem.
- `content.js`: controla velocidade e preservação de pitch nos players da página.
- `popup.html`, `popup.css` e `popup.js`: interface e controles.
