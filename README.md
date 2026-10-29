# Observable Evidence Atlas · demonstração

[Abrir a demonstração](https://amandaarruda.github.io/automatic-taxonomy-demo/) · interface em inglês e português, tema claro e escuro.

Você escolhe vídeos sintéticos de um cenário de empresa financeira (agências, ATMs, cofre, escritórios, áreas externas), e a descoberta da taxonomia roda de verdade no seu navegador: validação das respostas, agrupamento HDBSCAN, segunda etapa de agrupamento, nomes automáticos e o Observable Evidence Atlas final. O cálculo usa o código Python do produto, executado com o [Pyodide](https://pyodide.org) num Web Worker.

**Só o modelo de visão e linguagem é simulado.** Os vídeos são animações sintéticas e as respostas do modelo são frases roteirizadas, guardadas em cache junto com os embeddings BGE de cada frase. No navegador, a implementação de HDBSCAN é a do scikit-learn, e as posições exibidas vêm do layout UMAP pré-calculado. Os resultados não representam o desempenho de nenhum modelo.

A página não envia dados a nenhum servidor. Na primeira execução ao vivo, ela baixa o Pyodide com numpy, scipy e scikit-learn (cerca de 40 MB, guardados no cache do navegador). As seleções prontas e as seleções já calculadas neste navegador abrem na hora.

Componentes de terceiros: veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
