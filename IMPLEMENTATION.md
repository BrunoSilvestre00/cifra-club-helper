# Estado da implementação

- Biblioteca por artista, nome ou criação, com seleção por checkbox e atalhos para selecionar/desselecionar todas.
- Exportação conjunta e importação transacional de várias músicas, com revisão e detecção pela chave artista-slug + música-slug.
- IndexedDB como armazenamento principal, incluindo artistas, músicas e controle de versões. Sem backend.
- Editor compartilhado em `/new` e `/:artista/:musica`, estrutura lateral e edição de um bloco por vez.
- Blocos Letra, Arranjo e Arranjo com letra; partes predefinidas incluindo Música inteira.
- Braço de violão/viola, seleção múltipla de cordas, confirmação por Adicionar/Enter e seleção consistente após excluir eventos.
- Prévia permanente, TXT/JSON, undo/redo, temas claro/escuro e logo/favicon do usuário.
- Build estático preparado para o caminho do repositório no Pages. A CI valida pull requests e publica automaticamente os pushes na `main` após testes e build, usando um artefato e o ambiente `github-pages`, sem versionar `dist/`.

Verificação local: TypeScript e 55 testes Vitest. Build local impedido por `spawn EPERM`; a CI valida o build no GitHub. Revisão visual e colagem no Cifra Club ainda são manuais.
