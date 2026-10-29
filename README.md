# Observable Evidence Atlas · demonstração

[Abrir a demonstração](https://amandaarruda.github.io/automatic-taxonomy-demo/)

Esta página mostra, em sete passos animados, como o produto transforma um conjunto de vídeos em uma taxonomia de evidências visuais, e termina num Observable Evidence Atlas navegável.

**Tudo aqui é simulado.** Os vídeos são animações sintéticas desenhadas no navegador e as respostas da VLM são frases roteirizadas. A partir das respostas, o processamento é o do próprio produto: validação do formato, embeddings BGE, agrupamento HDBSCAN, agrupamento das famílias, nomes automáticos e projeções. O resultado (945 vídeos sintéticos, 601 frases, 32 grupos, 4 famílias) não representa o desempenho de nenhum modelo.

A página não envia dados a nenhum servidor e não recebe vídeos. Para analisar vídeos de verdade, o produto roda localmente, na infraestrutura de quem o utiliza.

Componentes de terceiros: veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
