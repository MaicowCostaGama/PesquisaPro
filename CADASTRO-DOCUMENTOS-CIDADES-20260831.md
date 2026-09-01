# Cadastro de pesquisador — documentos e cidades

Esta versão atualiza o cadastro público aberto por link de recrutador.

## Alterações

O cadastro exige documento oficial com foto e comprovante de endereço. Os arquivos são enviados para o bucket privado `researcher-documents` e os caminhos são gravados na tabela `signups`; o pesquisador não recebe acesso de leitura aos documentos.

A cidade onde a pessoa mora continua sendo um campo independente. Para as cidades em que deseja atuar, o formulário usa uma lista pesquisável dos 853 municípios de Minas Gerais, obtida da API de Localidades do IBGE e armazenada localmente em `public-cities.js`. O candidato pode escolher de uma a cinco cidades, remover escolhas e pesquisar sem acentos.

## Gestão

Na fila de cadastros do painel Usuários, a gestão visualiza os botões temporários `Documento` e `Endereço` quando os arquivos existem. Cada botão gera uma URL assinada com validade curta, sem tornar o bucket público.

## Banco

Executar `deploy/recrutamento-documentos.sql` depois de `deploy/recrutamento.sql`. A migration cria o bucket privado, restringe upload público à pasta `signups/`, libera leitura e remoção apenas para administradores e atualiza a RPC `submit_recruiter_signup` com documentos obrigatórios e limite de cinco cidades.

## Limitações intencionais

A versão aceita imagens e PDF de até 10 MB por arquivo. A validação de conteúdo e a decisão de aprovação continuam sendo responsabilidade da equipe administrativa; o aplicativo apenas impede arquivos ausentes, tipos não aceitos, excesso de tamanho e mais de cinco cidades.

## Fonte da lista de cidades

A lista local foi gerada a partir da API oficial de Localidades do IBGE: https://servicodados.ibge.gov.br/api/v1/localidades/estados/MG/municipios
