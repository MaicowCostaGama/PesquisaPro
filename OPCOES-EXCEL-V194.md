# PesquisaPro v194 — importação de até 10.000 opções

O importador de opções das perguntas agora aceita até **10.000 opções válidas** por arquivo.

## Formato

- Arquivos aceitos: `.xlsx`, `.xls` ou `.csv`.
- O sistema lê a primeira aba e a primeira coluna preenchida.
- Deve ser usada uma opção por linha.
- Com cabeçalho: até 10.001 linhas no total, sendo 1 cabeçalho + 10.000 opções.
- Sem cabeçalho: até 10.000 linhas de opções.
- Linhas vazias e duplicidades são removidas.
- Cada opção pode ter até 200 caracteres.
- O arquivo permanece limitado a 8 MB.

A primeira linha pode ser marcada como cabeçalho na janela de prévia. O limite maior é aplicado tanto à leitura da planilha quanto à lista final após deduplicação.
