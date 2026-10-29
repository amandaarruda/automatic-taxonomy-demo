# Demonstração do Observable Evidence Atlas

[Abrir a demonstração](https://amandaarruda.github.io/automatic-taxonomy-demo/).

Esta página pública permite explorar um atlas estático produzido a partir de 32 respostas arquivadas do InternVL3.5-8B para vídeos do conjunto UCF-Crime. Não há vídeos nem frames neste repositório. A interface é em português; as frases e os nomes derivados permanecem no idioma original das respostas do modelo.

A amostra contém 96 evidências, 14 grupos e duas famílias candidatas. Os agrupamentos foram calculados com BGE e HDBSCAN; o tamanho mínimo de grupo 3 foi usado para tornar a pequena amostra explorável, enquanto o padrão alinhado ao artigo é 8. As previsões são do modelo, não rótulos de referência. Os nomes são propostas automáticas, não categorias validadas por pessoas.

A página é apenas para consulta: ela não recebe vídeos e não executa modelos. Para analisar vídeos, o produto e a VLM devem ser executados localmente, usando os recursos da organização. Recomendamos InternVL3.5-8B; modelos alternativos precisam atender ao contrato de imagens e JSON.

A estratégia de amostragem de frames da execução original não estava disponível nos registros. Os identificadores de vídeo são referências à origem, e os hashes de demonstração são derivados desses identificadores, não dos arquivos originais. Os dados exibidos devem ser interpretados junto dos termos e da licença do conjunto UCF-Crime e dos modelos utilizados.
