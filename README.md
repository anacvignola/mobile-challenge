# Lexi · English Dictionary

Um aplicativo em **React Native + Expo + TypeScript** para descobrir palavras em inglês, ouvir a pronúncia e construir uma coleção pessoal.

> This is a challenge by [Coodesh](https://coodesh.com/)

O enunciado original está preservado em [CHALLENGE.md](./CHALLENGE.md). O wireframe de referência está em [img/wireframe.png](./img/wireframe.png).

## Executar

Pré-requisitos: Node.js 20.19.4+ (ou uma versão LTS mais recente compatível com Expo 54), npm e Expo Go compatível com SDK 54, ou development build. No iOS, builds locais exigem macOS/Xcode configurado; Android exige Android Studio para o emulador. Um aparelho físico pode acessar o Metro na mesma rede.

```sh
npm install
npx expo install --check
npm run words:import
npm start
```

Use `i` para abrir o simulador iOS, `a` para Android ou leia o QR code com Expo Go compatível. Alternativas: `npm run ios`, `npm run android`, `npm run web`.

**A lista completa precisa ser importada antes da avaliação.** `words:import` baixa o `words_dictionary.json` oficial de [dwyl/english-words](https://github.com/dwyl/english-words), valida pelo menos 300 mil palavras e gera `src/data/words.json`. Também aceita arquivo local:

```sh
npm run words:import -- /caminho/words_dictionary.json
```

O arquivo fornecido nesta implementação contém uma **lista inicial reduzida**, identificada na interface. Não representa o corpus completo do desafio. A importação preserva a lista anterior se a rede ou a validação falhar. Depois de importar, reinicie o Metro se necessário. A fonte permanece incluída no aplicativo e não depende da rede para navegar na lista. Consulte a licença e os avisos do repositório original ao distribuir os dados importados.

## Backend e contas

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Execute `supabase/schema.sql` no SQL Editor uma única vez.
3. Copie `.env.example` para `.env` e informe a URL e a chave pública anon do projeto.
4. Habilite o provedor Email em Authentication. O fluxo suporta confirmação por email: confirme a conta e volte ao aplicativo para entrar.
5. Reinicie o Metro após alterar o ambiente.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

Nunca use uma chave `service_role` no aplicativo. RLS limita cada linha ao `auth.uid()` correspondente. A chave composta `(user_id, word)` evita registros duplicados; há índice para o histórico. `viewed_at` controla a recência. Login/cadastro usam Supabase Auth, não senhas armazenadas pelo aplicativo. A sessão é persistida com AsyncStorage conforme o fluxo de referência do Supabase para React Native; em uma evolução de produção, avaliar armazenamento criptografado de sessão conforme o modelo de ameaça.

Sem credenciais, o aplicativo funciona como visitante, com favoritos e histórico locais. A tela de conta explica essa condição. As coleções visitante e autenticada são separadas e **não são mescladas automaticamente**. Contas configuradas usam o banco remoto como fonte de verdade; salvar favoritos e histórico nessa modalidade exige conexão e erros aparecem na tela. Não há fila de sincronização offline remota.

## Funcionalidades

| Requisito | Implementação |
| --- | --- |
| Lista com rolagem infinita | FlatList virtualizada, páginas cumulativas de 60 palavras e botão acessível para carregar mais |
| Detalhes | Modal com palavra, fonética disponível, todos os significados, exemplos, sinônimos e fonte |
| Favoritar e remover | Botão Save/Saved, persistência local ou remota por usuário |
| Histórico | Registro após consulta bem-sucedida, sem duplicatas, mais recente primeiro |
| Cache | Persistente, chave normalizada, validade de sete dias, fallback expirado se a rede falhar |
| Wireframe | Abas Word list/History/Favorites, grade, detalhes, voltar/próximo e pronúncia |
| Áudio | Pronúncia nativa em inglês americano via expo-speech; botão para interromper |
| Injeção de dependências | Repositório de coleção e cliente de dicionário com portas explícitas |
| Testes | 12 testes de regras e do cliente de consulta real com rede/storage injetados |
| Login e senha | Supabase Auth, favoritos e histórico associados ao usuário, políticas RLS |

A Free Dictionary API não contém definições para todas as palavras do corpus. O app trata 404 sem registrar uma consulta malsucedida no histórico e permite tentar novamente. A busca filtra por **prefixo**, sobre toda a fonte selecionada; não se limita às palavras renderizadas. O botão próximo navega pela lista carregada no momento da abertura; carregar mais palavras na listagem amplia a próxima sessão de navegação.

## Design e acessibilidade

A identidade usa fundo creme, verde profundo, títulos serifados e cartões com espaçamento generoso. As três abas do wireframe permanecem visíveis. O cartão editorial de destaque dá um ponto de partida à exploração; sua descrição é texto editorial, enquanto o detalhe vem da API. Textos em inglês mantêm a experiência consistente com o idioma estudado.

Há layouts com duas colunas no telefone e três em telas maiores, limite de largura em tablets, SafeArea, alvos de toque de pelo menos 48 pontos nas ações principais, estados de seleção, rótulos para leitores de tela, estados de carregamento, erro, retry e listas vazias. Textos usam escala de fonte do sistema. A conformidade completa com acessibilidade requer avaliação em aparelhos e leitores de tela.

A pronúncia usa síntese nativa, sem biblioteca de áudio remota. Isso evita depender de URLs de áudio incompletas. Voz e disponibilidade offline dependem das vozes instaladas. No iPhone físico, `expo-speech` pode ficar silencioso com o modo silencioso ativado. A reprodução para ao trocar de palavra ou fechar o detalhe.

## Arquitetura

```text
App.tsx                         Composição, sessão, busca e listagem
src/components/                 Botões, autenticação e detalhe de palavra
src/hooks/useCollection.ts      Estado e ciclo de vida da coleção
src/services/collection.ts      Repositório com implementação local/remota
src/services/dictionary.ts      Composição do cliente de consulta
src/services/dictionary-client.mjs Cliente testável: cache, timeout e rede
src/services/core.mjs            Regras puras de paginação e histórico
src/services/supabase.ts         Cliente de autenticação/backend
src/data/words.json              Corpus substituído pelo importador
supabase/schema.sql             Tabela, índice e políticas RLS
scripts/import-words.mjs         Importação verificável da fonte oficial
tests/                          Testes executáveis sem dependências externas
```

Os arquivos `.mjs` de domínio têm declarações `.d.mts` para integração tipada com TypeScript. Essa pequena fronteira permite testar as regras que o app realmente importa com o runner nativo do Node, sem mocks do React Native nem transformação adicional.

### Performance e consistência

- FlatList monta uma janela de cartões; a paginação concatena a área visível sem substituir páginas anteriores.
- Cartões usam `memo`; cálculos de busca/coleção usam `useMemo`; `useDeferredValue` permite priorizar a digitação. Filtrar o corpus ainda tem custo linear: uma evolução para datasets maiores seria indexar prefixos no SQLite.
- O corpus é local e a API só é chamada ao abrir um detalhe.
- Consultas simultâneas da mesma palavra compartilham uma Promise. Há timeout de 10 segundos, normalização de chave e cache entre reinicializações.
- Falhas de escrita no cache não escondem um resultado válido. Cache corrompido é ignorado; resposta inválida não é armazenada. O cache não possui limite global de tamanho nesta versão.
- Resultados de detalhes desmontados/trocados são ignorados. Consultas em andamento podem terminar para alimentar o cache, mas não alteram a tela antiga.
- Escritas de coleção são serializadas no repositório; ações concorrentes na UI são bloqueadas durante a gravação. O estado só muda após confirmação da persistência.
- Trocas de usuário invalidam respostas antigas da coleção; a renovação do token acompanha o ciclo de vida do app.

## Validação

```sh
npm test
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform web
```

**Executado neste ambiente:** verificação sintática de 10 arquivos TS/TSX com o compilador TypeScript (zero erros de sintaxe; não substitui typecheck com dependências) e `npm test` — 12 testes passaram, cobrindo paginação cumulativa, busca fora da primeira página, histórico sem duplicatas, preservação de favorito, cache entre clientes, deduplicação, fallback offline, 404 com retry, cache inválido, disco cheio, timeout e resposta inválida.

**Bloqueios verificados:** DNS/rede indisponível para npm e GitHub; instalação offline falhou por pacote ausente no cache. Por isso não foi possível gerar lockfile, importar o corpus completo, executar TypeScript/ESLint/Expo, renderizar a interface ou validar em emulador/dispositivo. O Git do sistema também exige aceite da licença do Xcode; nenhum commit foi criado. Não há alegação de build, teste visual ou integração Supabase executados.

### Checklist manual após configurar o ambiente

1. Importar o corpus completo, iniciar o app e rolar além de três páginas; confirmar que as anteriores permanecem.
2. Buscar `hello`, abrir o detalhe, ouvir/parar a pronúncia e navegar entre palavras.
3. Favoritar, consultar History/Favorites e reiniciar o app para verificar persistência.
4. Abrir uma palavra em rede, reiniciar sem internet e repetir a consulta; testar uma palavra ainda não consultada.
5. Testar um termo sem definição, erro de rede e retry; nenhum deles deve travar a tela.
6. Criar duas contas Supabase; verificar isolamento, persistência ao entrar novamente e negação de leitura/escrita de linhas de outro usuário.
7. Avaliar VoiceOver/TalkBack, fonte ampliada, teclado, telefone pequeno e tablet.

## Investigação e decisões

1. A leitura do README e do wireframe identificou a ausência de projeto inicial e a separação entre fonte de palavras e API de definições.
2. React Native com Expo foi escolhido para compartilhar código iOS/Android e disponibilizar síntese nativa com menor esforço de configuração.
3. Persistência de favoritos e cache são responsabilidades distintas: o cache é compartilhável por palavra; a coleção exige isolamento por usuário.
4. Supabase atende ao backend pedido e ao diferencial de autenticação; o modo visitante mantém o aplicativo utilizável antes da configuração externa.
5. Injeção via interfaces/fábricas evita um container de DI desnecessário neste tamanho de projeto.
6. Testes priorizam contratos de dados e falhas assíncronas. A apresentação visual e os fluxos nativos ficam pendentes de execução real devido aos bloqueios registrados acima.

Referências consultadas: [Dictionary API](https://dictionaryapi.dev/), [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/).
