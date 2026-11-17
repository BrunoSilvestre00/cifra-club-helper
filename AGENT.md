# Projeto: Editor Visual de Cifras e Tablaturas para Cifra Club

Você é um engenheiro de software sênior especializado em React, TypeScript, interfaces interativas e arquitetura frontend.

Sua tarefa é **planejar e implementar uma aplicação web funcional para edição visual de cifras musicais e tablaturas**, com foco na geração de texto monoespaçado compatível com o padrão de publicação do Cifra Club.

Não quero apenas um protótipo visual ou mockup. Quero uma aplicação funcional, utilizável e extensível.

## 1. Contexto e problema

Atualmente, cadastro cifras manualmente no Cifra Club. O editor utiliza texto monoespaçado, o que causa dois problemas principais:

**Problema A — Alinhamento de acordes**

Preciso inserir espaços manualmente para posicionar os acordes acima das sílabas correspondentes da letra. Qualquer alteração no texto pode desalinhar os acordes.

**Problema B — Edição de tablaturas**

Preciso desenhar tablaturas ASCII manualmente, adicionando traços, números, símbolos e espaçamentos para representar notas, solos e técnicas instrumentais.

Quero eliminar esse trabalho manual com uma interface visual e intuitiva.

### Referência real

Analise esta cifra que publiquei manualmente:

https://www.cifraclub.com.br/nenem-e-manuelzito/preto-velho-simiao/

Utilize-a como referência para compreender o formato final desejado, especialmente:

- Alinhamento de acordes e letras.
- Tablaturas de introduções e solos.
- Representação de técnicas instrumentais.
- Organização das seções musicais.
- Formatação textual utilizada pelo Cifra Club.

Pesquise também, quando necessário, a documentação oficial de formatação do Cifra Club.

Não assuma que o Cifra Club aceita formatos como ChordPro, MusicXML ou Guitar Pro diretamente. A saída principal deve ser texto puro, pronto para copiar e colar.

## 2. Objetivo

Desenvolver uma aplicação web que permita:

1. Criar e editar músicas organizadas em seções.
2. Escrever letras e posicionar acordes visualmente.
3. Criar tablaturas clicando nas cordas e casas de um braço virtual.
4. Editar sequências de notas, acordes instrumentais e técnicas musicais.
5. Visualizar em tempo real o texto final.
6. Exportar a música completa para o formato textual utilizado no Cifra Club.
7. Salvar e recuperar projetos para continuar a edição posteriormente.

A aplicação deve priorizar **facilidade de edição, precisão de alinhamento e qualidade da exportação**.

## 3. Stack tecnológica

Utilize preferencialmente:

- React com TypeScript.
- Vite.
- Tailwind CSS.
- Zustand para gerenciamento de estado.
- Zod para validação de dados.
- IndexedDB para persistência local.
- Vitest para testes.

Não implementar backend, autenticação ou infraestrutura de nuvem no MVP.

A aplicação deve funcionar inteiramente no navegador.

Pode utilizar bibliotecas adicionais quando elas realmente simplificarem a implementação, mas evite dependências desnecessárias.

## 4. Arquitetura

Organize a aplicação em módulos independentes:

### Music Domain

Responsável pelo modelo de dados musical.

Deve representar:

- Música e metadados.
- Seções.
- Linhas de letras.
- Acordes e suas posições.
- Tablaturas.
- Notas e técnicas.
- Instrumentos e afinações.

Não armazene a música exclusivamente como texto ASCII.

Utilize uma representação estruturada que possa ser editada sem manipulação manual de espaços.

### Chord Editor

Editor visual de letras e acordes.

### Tablature Editor

Editor visual de notas e solos.

### Instrument/Fretboard

Representação interativa do braço do instrumento.

### Text Renderer

Responsável por transformar os dados estruturados em texto monoespaçado.

### Persistence

Salvamento e carregamento local de projetos.

### Export

Exportação e cópia do resultado.

O domínio musical e os renderizadores devem ser independentes dos componentes React.

## 5. Editor de letras e acordes

Implementar uma interface na qual o usuário possa:

- Digitar ou colar letras normalmente.
- Selecionar a posição exata de uma sílaba.
- Inserir um acorde nessa posição.
- Arrastar acordes horizontalmente para reposicioná-los.
- Editar e remover acordes.
- Adicionar ou remover linhas.
- Organizar a música em seções.
- Visualizar os acordes sobre a letra em tempo real.

O editor deve trabalhar com posições lógicas no texto, não com espaços adicionados manualmente.

Ao modificar a letra, os acordes devem acompanhar as alterações sempre que possível.

Tratar corretamente inserções, exclusões, quebras de linha, caracteres acentuados e posições de acordes.

A exportação deve calcular os espaços necessários automaticamente.

Se dois acordes ficarem próximos demais, o renderizador deve resolver o conflito sem sobrepor textos ou alterar silenciosamente a posição musical pretendida.

## 6. Editor visual de tablaturas

Este é um dos módulos mais importantes.

### Interface principal

Implementar um braço virtual interativo.

O usuário deve poder:

- Selecionar uma corda ou ordem de cordas.
- Clicar em uma casa para inserir uma nota.
- Adicionar notas sequencialmente.
- Inserir notas simultâneas em cordas diferentes.
- Selecionar uma nota existente.
- Alterar sua casa ou corda.
- Remover notas.
- Reordenar eventos.
- Inserir pausas ou espaços.
- Visualizar a tablatura ASCII resultante em tempo real.

O braço deve funcionar como mecanismo de entrada de notas, e a tablatura deve funcionar como representação e mecanismo complementar de edição.

### Instrumentos

Suportar inicialmente:

- Violão de seis cordas.
- Viola caipira de dez cordas, organizada em cinco ordens duplas.

Permitir configurar afinações personalizadas.

Incluir presets para afinações comuns, como Cebolão E e Cebolão D, respeitando as notas e oitavas corretas de cada ordem.

Não assumir que todos os instrumentos possuem seis cordas.

O modelo deve distinguir cordas físicas e ordens duplas, mesmo que a representação textual da viola utilize cinco linhas.

### Técnicas instrumentais

Implementar inicialmente:

- Hammer-on.
- Pull-off.
- Slide ascendente e descendente.
- Bend.
- Harmônicos naturais.
- Vibrato.

Permitir que o usuário selecione uma técnica e associe-a às notas correspondentes.

A representação textual deve seguir convenções de tablatura ASCII, com possibilidade de ajustar símbolos conforme o padrão desejado.

### Posicionamento das notas

A tablatura deve permitir:

- Notas consecutivas.
- Notas simultâneas.
- Espaçamento manual entre eventos, quando necessário.
- Agrupamento em frases ou trechos.
- Quebra de linhas longas.

Não exigir notação rítmica completa no MVP.

Entretanto, o modelo de dados deve permitir adicionar duração musical futuramente.

O renderizador deve considerar números de casas com um ou mais dígitos, símbolos de técnicas e alinhamento vertical entre todas as cordas.

## 7. Renderizador ASCII

Criar um módulo de renderização determinístico e independente da interface.

Ele receberá os dados musicais estruturados e produzirá texto puro.

### Cifras

Exemplo conceitual:

```text
E                 B7
Preto velho está cinzento
```

Os acordes devem ficar alinhados com as posições lógicas definidas pelo usuário.

### Tablaturas

Exemplo conceitual:

```text
E|--0--4--7--5----------------|
B|-------------7--4----------|
G|------------------5--------|
D|---------------------7-6-5-|
A|--0------------------------|
```

Os exemplos são apenas ilustrativos e não devem ser tratados como transcrições da música de referência.

### Requisitos

- Preservar alinhamento vertical.
- Gerar espaçamento horizontal consistente.
- Suportar números de casas com múltiplos dígitos.
- Renderizar técnicas instrumentais.
- Permitir nomes personalizados para as linhas das cordas.
- Preservar a organização da música.
- Não adicionar caracteres desnecessários.
- Permitir copiar o resultado completo.
- Permitir baixar arquivo TXT.

Evite usar posições em pixels como representação principal da música. O posicionamento visual deve ser convertido para coordenadas musicais ou textuais estáveis.

O renderizador deve possuir testes unitários cobrindo situações simples e complexas.

## 8. Interface e experiência do usuário

Criar uma interface moderna, limpa e responsiva, com foco em produtividade.

Sugestão de layout desktop:

**Barra superior**
- Nome da música.
- Instrumento.
- Afinação.
- Salvar.
- Abrir.
- Exportar.

**Painel principal**
- Editor de seções.
- Editor de letras e acordes.
- Editor de tablaturas.

**Painel lateral ou inferior**
- Pré-visualização do texto exportado.
- Configurações do elemento selecionado.

O usuário deve conseguir alternar facilmente entre edição de cifras e tablaturas.

Evite uma interface excessivamente complexa semelhante a um DAW profissional.

A experiência deve ser mais próxima de um editor de texto musical especializado.

### Usabilidade

Implementar:

- Seleção visual clara.
- Atalhos de teclado.
- Undo/Redo.
- Feedback ao inserir notas.
- Exclusão simples de elementos.
- Rolagem e navegação intuitivas.
- Pré-visualização em fonte monoespaçada.
- Indicadores de alterações não salvas.

Priorizar desktop, mas manter uma interface responsiva.

## 9. Persistência

Salvar os projetos localmente usando IndexedDB.

Cada projeto deve conter:

- Metadados.
- Seções.
- Letras.
- Acordes.
- Tablaturas.
- Instrumentos e afinações.
- Versão do esquema de dados.

Implementar:

- Salvamento automático.
- Lista de projetos locais.
- Criação e exclusão de projetos.
- Exportação do projeto em JSON.
- Importação de projeto JSON.

Validar arquivos importados e prever evolução futura do esquema.

## 10. MVP e prioridades

Implementar em etapas, mantendo a aplicação executável e testável após cada uma.

### Fase 1 — Fundação

- Configurar o projeto.
- Definir modelo de dados.
- Implementar estado global.
- Implementar renderizadores básicos.
- Criar testes unitários.

### Fase 2 — Cifras

- Editor de letras.
- Inserção visual de acordes.
- Reposicionamento.
- Renderização em tempo real.

### Fase 3 — Tablaturas

- Braço interativo.
- Configuração de instrumento.
- Inserção e remoção de notas.
- Sequenciamento de eventos.
- Técnicas instrumentais.
- Renderização ASCII.

### Fase 4 — Integração

- Música com seções mistas.
- Pré-visualização completa.
- Persistência.
- Exportação TXT.
- Importação/exportação JSON.
- Undo/Redo.

### Fase 5 — Qualidade

- Testes de casos extremos.
- Melhorias de UX.
- Validação do formato de saída.
- Correção de problemas de alinhamento.

## 11. Fora do escopo inicial

Não implementar neste momento:

- Reprodução de áudio.
- MIDI.
- Reconhecimento automático de notas.
- Conversão de áudio em tablatura.
- Partituras tradicionais.
- Autenticação.
- Sincronização em nuvem.
- Edição colaborativa.
- Aplicativo mobile nativo.

## 12. Critérios de aceitação

O MVP será considerado funcional quando for possível:

1. Criar uma música com título, artista e instrumento.
2. Colar uma letra e posicionar acordes visualmente sem digitar espaços.
3. Alterar a letra mantendo o alinhamento dos acordes sempre que possível.
4. Criar um solo clicando nas cordas e casas do braço virtual.
5. Inserir notas simultâneas e técnicas instrumentais.
6. Visualizar uma tablatura ASCII corretamente alinhada.
7. Misturar cifras e tablaturas em uma mesma música.
8. Exportar o conteúdo completo como texto puro.
9. Copiar o resultado e utilizá-lo no editor do Cifra Club.
10. Salvar o projeto e continuar a edição posteriormente.
11. Desfazer e refazer operações de edição.
12. Utilizar o editor com viola caipira e violão.

## 13. Qualidade de implementação

- Utilizar TypeScript com tipagem estrita.
- Evitar `any` desnecessário.
- Separar domínio, interface e renderização.
- Criar componentes reutilizáveis.
- Implementar testes para renderizadores.
- Evitar manipulação direta de strings ASCII como modelo de edição.
- Documentar decisões arquiteturais relevantes.
- Não adicionar dependências sem justificativa.
- Não deixar funcionalidades simuladas apresentadas como funcionais.

## 14. Instruções de execução

Primeiro, inspecione o repositório existente, caso haja algum.

Em seguida:

1. Analise os requisitos e a cifra de referência.
2. Defina a arquitetura e o modelo de dados.
3. Identifique riscos técnicos, especialmente alinhamento de acordes e tablaturas.
4. Crie um plano de implementação incremental.
5. Implemente o MVP, seguindo o plano.
6. Execute testes e build.
7. Corrija problemas identificados.
8. Documente como executar e utilizar a aplicação.

Tome decisões técnicas razoáveis sem interromper o desenvolvimento para pedir confirmação de detalhes secundários.

Caso alguma funcionalidade seja complexa demais para o MVP, implemente uma versão mínima realmente funcional, documente a limitação e mantenha a arquitetura preparada para evolução.

**Prioridade absoluta:** entregar uma ferramenta que realmente simplifique a criação de cifras e solos para publicação no Cifra Club, em vez de apenas reproduzir visualmente um editor musical.
