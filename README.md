# Sonora — Controle de Áudio

Extensão WebExtensions (Manifest V3) para Firefox que processa localmente o áudio da aba atual.

## Recursos desta versão

- Processamento contínuo do áudio da aba, mesmo com o popup fechado.
- Volume entre 0% e 300%, com limiter para reduzir estouros.
- Velocidade entre 0,5× e 2×, sincronizada com elementos `<audio>` e `<video>`.
- Opção para manter o pitch original ou deixá-lo acompanhar a velocidade.
- Equalizador de graves, médios e agudos.
- Reverb com mistura gradual entre som seco e processado.
- Largura estéreo entre mono, normal e ampliada.
- Balanço independente entre os canais esquerdo e direito.
- Modo noturno para aproximar sons baixos e controlar picos altos.
- Presets para diálogo, graves, cinema e audição durante a madrugada.
- Presets personalizados criados a partir dos ajustes atuais e salvos no navegador.
- Preset **Neutro** que restaura volume, velocidade, equalização, reverb e estéreo, deixando a preservação de pitch desligada.
- Atalhos para as velocidades mais usadas.
- Caixas reordenáveis, sem numeração, com a ordem persistida automaticamente.
- Controles que podem ser fixados como painéis flutuantes e arrastáveis sobre a página.
- Área de configurações para gerenciar presets, restaurar o layout e consultar a licença.

Todo o áudio permanece no navegador. A extensão não usa servidor nem envia gravações.

## Instalar no Firefox

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…**.
3. Selecione o arquivo `manifest.json` dentro desta pasta.
4. Fixe a extensão **Sonora** na barra do Firefox.

Instalada dessa forma, a extensão some quando o Firefox é reiniciado. Para uma instalação permanente, o Firefox exige que a extensão seja assinada pela Mozilla: envie o pacote para o [Add-on Developer Hub](https://addons.mozilla.org/developers/) (gratuito, funciona também para uso pessoal/não listado) ou use o Firefox Developer Edition/Nightly com `xpinstall.signatures.required` desativado em `about:config`.

## Usar

1. Abra um site com áudio ou vídeo.
2. Clique no ícone da Sonora. A extensão ativa automaticamente nessa guia.
3. Ajuste os controles e feche o popup quando quiser; o processamento continua ativo.
4. Para ouvir o áudio sem ajustes, clique em **Neutro**. Esse preset também restaura o volume para 100%, a velocidade para 1× e desliga a preservação de pitch.
5. Use o botão **+** após os presets para salvar os ajustes atuais com um nome.
6. Arraste uma caixa pelo puxador para mudar sua ordem. Para fixá-la sobre a página, use exclusivamente o botão no canto superior direito; enquanto estiver flutuando, ela não aparece no menu central.
7. Abra a engrenagem para remover presets personalizados, restaurar o layout ou consultar as licenças.
8. O processamento termina quando a guia é fechada.

O clique no ícone fornece o gesto do usuário exigido pelo navegador para liberar o áudio processado. Cada guia processa seu próprio áudio de forma independente — abrir a Sonora em outra guia não interrompe o processamento nas demais.

## Limitações conhecidas

- A velocidade e o processamento de áudio dependem de o site usar elementos HTML normais `<audio>`/`<video>`. Players totalmente personalizados podem ignorá-los.
- Algumas páginas internas do Firefox (`about:`) e conteúdos protegidos podem bloquear a injeção do controle.
- Áudio dentro de `<iframe>`s de outra origem não pode ser alcançado pelo script da página e por isso não é processado.
- Em algumas páginas, o processamento só é liberado após um clique na própria página (exigência do navegador para desbloquear o áudio), além do clique no ícone da extensão.
- A largura acima de 100% pode evidenciar artefatos de gravações com estéreo artificial; nesse caso, volte para **Normal**.
- O modo noturno usa compressão dinâmica e pode alterar a sensação de impacto de músicas muito intensas.

## Estrutura

- `manifest.json`: configuração da extensão Manifest V3.
- `src/runtime/`: processo de fundo e controlador injetado nas páginas.
- `src/audio/`: processador de largura estéreo (AudioWorklet) usado pelo pipeline Web Audio, montado dentro de `src/runtime/content.js`.
- `src/popup/`: interface, estilos e interações do menu da extensão.
- `assets/icons/`: ícones da Sonora.
- `LICENSE`: licença MIT do projeto.

## Privacidade e dependências

As preferências ficam na API WebExtensions Storage (`storage.local`, acessada via `chrome.storage.local`). A Sonora não inclui bibliotecas de terceiros e não faz requisições externas: usa somente JavaScript nativo, APIs de Extensões do Firefox e Web Audio API.
