# Relatórios em tempo real e cruzamentos

A aba **Relatórios** foi ampliada para dois modos de análise. O modo **Todas as perguntas** apresenta, em uma única tela, a distribuição de cada pergunta objetiva da pesquisa, com contagem, percentual sobre a base válida e barras comparativas. Perguntas abertas são mantidas fora da tabulação automática porque exigem análise textual específica.

O modo **Montar relatório** permite selecionar de uma a três perguntas não abertas. A consulta é feita no banco e devolve somente combinações agregadas por entrevista, sem expor respostas individuais, nomes ou pesquisadores. Em perguntas de múltipla escolha, as opções marcadas na mesma entrevista são agrupadas na célula correspondente.

A base considera somente eventos com `status = 'valid'` e `is_calibration = false`. O painel atualiza a análise a cada 15 segundos e também tenta receber eventos do Supabase Realtime nas tabelas `collection_events` e `collection_answers`. Quando a aba é fechada, o intervalo e o canal são encerrados.

A migration `deploy/relatorios-tempo-real-cruzamentos.sql` cria as RPCs protegidas `survey_report_all_questions` e `survey_report_cross_tab`. Ambas exigem `public.is_staff()`, limitam o cruzamento a três variáveis e não retornam linhas individuais. Execute a migration no SQL Editor do Supabase antes de usar a nova visão em produção.

O montador oferece exportação CSV do resultado cruzado para análise complementar. Os percentuais são calculados sobre a base total de entrevistas válidas da pesquisa, e não sobre registros reprovados, calibração ou respostas de pesquisadores específicos.
