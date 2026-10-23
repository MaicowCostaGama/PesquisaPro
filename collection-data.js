/*
 * Dados da coleta — primeira fase
 *
 * Este módulo é deliberadamente separado dos stores legados SURVEYS,
 * COLLECT_EVENTS, PAYMENTS e USERS. A integração da tela decide quando chamar
 * cada carregador; este arquivo somente lê dados e publica snapshots prontos.
 */
(function (root) {
  'use strict';

  const INDEX_PAGE_SIZE = 500;
  const MAX_INDEX_ROWS = 100000;
  const CACHE_TTL_MS = 30000;
  const OPERATION_TIMEOUT_MS = 15000;
  const RESOURCE_NAMES = new Set(['index', 'survey', 'previous', 'recent', 'quotas']);

  let onChange = null;
  let sessionGeneration = 0;
  let sessionStarted = false;
  let sessionOwner = null;
  let sessionOwnerId = null;

  const indexRecord = makeRecord('index');
  const records = {
    index: indexRecord,
    survey: new Map(),
    previous: new Map(),
    recent: makeRecord('recent'),
    quotas: new Map(),
  };

  function makeRecord(name) {
    return {
      name,
      status: 'idle',
      error: null,
      value: null,
      updatedAt: 0,
      promise: null,
      controller: null,
      token: null,
      owner: null,
      generation: 0,
    };
  }

  function getProfile() {
    /* CURRENT_PROFILE é let no app.js e, por isso, pode não ser propriedade de
       window. O try mantém este módulo carregável sozinho em VM/testes. */
    try {
      if (typeof CURRENT_PROFILE !== 'undefined') return CURRENT_PROFILE;
    } catch (error) {
      /* global CURRENT_PROFILE */
    }
    return root && root.CURRENT_PROFILE ? root.CURRENT_PROFILE : null;
  }

  function getClient() {
    if (root && root.PP_SUPABASE_CLIENT) return root.PP_SUPABASE_CLIENT;
    try {
      if (typeof sb !== 'undefined' && sb) return sb;
    } catch (error) {
      /* sb pode não existir quando o módulo é testado isoladamente. */
    }
    return null;
  }

  function getHelper(name) {
    if (root && typeof root[name] === 'function') return root[name];
    try {
      if (name === 'surveyRowToSnapshot' && typeof surveyRowToSnapshot === 'function') return surveyRowToSnapshot;
      if (name === 'loadSurveyQuestionOptions' && typeof loadSurveyQuestionOptions === 'function') return loadSurveyQuestionOptions;
      if (name === 'attachSurveyQuestionOptions' && typeof attachSurveyQuestionOptions === 'function') return attachSurveyQuestionOptions;
      if (name === 'isCollectionTestUser' && typeof isCollectionTestUser === 'function') return isCollectionTestUser;
    } catch (error) {
      /* helper ainda não foi carregado; a mensagem de erro fica explícita abaixo. */
    }
    return null;
  }

  function getJoinSelect(name) {
    try {
      if (name === 'full' && typeof SURVEY_JOIN_SELECT !== 'undefined') return SURVEY_JOIN_SELECT;
      if (name === 'legacy' && typeof SURVEY_JOIN_SELECT_LEGACY !== 'undefined') return SURVEY_JOIN_SELECT_LEGACY;
    } catch (error) {
      /* constantes do app podem não existir no teste unitário. */
    }
    return name === 'full'
      ? '*, survey_questions(*, survey_question_fields(*)), survey_clients(client_id, results_released), survey_team(researcher_id)'
      : '*, survey_questions(*), survey_clients(client_id, results_released), survey_team(researcher_id)';
  }

  function profileId(profile = getProfile()) {
    return profile && profile.id != null ? String(profile.id) : '';
  }

  function isTestProfile(profile) {
    const helper = getHelper('isCollectionTestUser');
    if (helper) {
      try {
        return helper(profile) === true;
      } catch (error) {
        return false;
      }
    }
    return profile?.role === 'pesq' && profile?.status === 'ativo' && profile?.is_collection_test_user === true;
  }

  function syncSession() {
    const profile = getProfile();
    const id = profileId(profile);
    if (!sessionStarted) {
      sessionStarted = true;
      sessionOwner = profile;
      sessionOwnerId = id;
      return;
    }
    if (sessionOwner !== profile || sessionOwnerId !== id) {
      resetInternal(false);
      sessionOwner = profile;
      sessionOwnerId = id;
    }
  }

  function isCurrent(owner, generation) {
    const profile = getProfile();
    return profile === owner && profileId(profile) === profileId(owner) && generation === sessionGeneration;
  }

  function errorMessage(error) {
    if (!error) return '';
    return String(error.message || error.error_description || error);
  }

  function makeError(message, name = 'CollectionDataError') {
    const error = new Error(message);
    error.name = name;
    return error;
  }

  function isAbortError(error) {
    return !!error && (error.name === 'AbortError' || /aborted|abortado|cancelad/i.test(error.message || ''));
  }

  function newAbortController() {
    if (typeof AbortController === 'function') return new AbortController();
    let aborted = false;
    const listeners = [];
    return {
      signal: {
        get aborted() { return aborted; },
        addEventListener(type, listener) { if (type === 'abort') listeners.push(listener); },
      },
      abort() {
        if (aborted) return;
        aborted = true;
        listeners.slice().forEach(listener => { try { listener(); } catch (error) { /* noop */ } });
      },
    };
  }

  function applyAbortSignal(query, signal) {
    if (!query || !signal || typeof query.abortSignal !== 'function') return query;
    const result = query.abortSignal(signal);
    return result === undefined ? query : result;
  }

  async function awaitQuery(query, signal) {
    return await applyAbortSignal(query, signal);
  }

  function notify(name, id, owner, generation) {
    if (!onChange || !isCurrent(owner, generation)) return;
    try {
      onChange(name, id == null ? undefined : String(id));
    } catch (error) {
      /* Callback de renderização não pode corromper o store nem a promessa. */
    }
  }

  function recordFor(name, id) {
    if (name === 'index' || name === 'recent') return records[name];
    const key = String(id == null ? '' : id);
    if (!key) return null;
    if (!records[name].has(key)) records[name].set(key, makeRecord(name));
    return records[name].get(key);
  }

  function publicState(record) {
    if (!record) return { status: 'idle', error: null };
    return {
      status: record.status,
      error: record.error ? errorMessage(record.error) : null,
    };
  }

  function fresh(record) {
    return !!record && record.status === 'ready' && record.updatedAt > 0 && Date.now() - record.updatedAt < CACHE_TTL_MS;
  }

  function hasCachedValue(record) {
    return !!record && record.value !== null && record.value !== undefined;
  }

  function resetRecord(record) {
    if (!record) return;
    if (record.controller) {
      try { record.controller.abort(); } catch (error) { /* noop */ }
    }
    record.status = 'idle';
    record.error = null;
    record.value = null;
    record.updatedAt = 0;
    record.promise = null;
    record.controller = null;
    record.token = null;
    record.owner = null;
    record.generation = 0;
  }

  function resetInternal(keepSessionMarker) {
    sessionGeneration += 1;
    resetRecord(indexRecord);
    records.survey.forEach(resetRecord);
    records.previous.forEach(resetRecord);
    resetRecord(records.recent);
    records.quotas.forEach(resetRecord);
    records.survey.clear();
    records.previous.clear();
    records.quotas.clear();
    if (!keepSessionMarker) {
      /* O marcador é reposto pelo chamador de syncSession para a nova conta. */
      sessionOwner = null;
      sessionOwnerId = null;
    }
  }

  function reset() {
    syncSession();
    resetInternal(true);
  }

  function cancelRecord(record) {
    if (!record || record.status !== 'loading') return;
    const hadValue = hasCachedValue(record);
    const controller = record.controller;
    record.token = null;
    record.promise = null;
    record.controller = null;
    record.owner = null;
    record.generation = 0;
    record.status = hadValue ? 'ready' : 'idle';
    record.error = null;
    if (controller) {
      try { controller.abort(); } catch (error) { /* noop */ }
    }
  }

  function cancelPending() {
    syncSession();
    cancelRecord(indexRecord);
    cancelRecord(records.recent);
    records.survey.forEach(cancelRecord);
    records.previous.forEach(cancelRecord);
    records.quotas.forEach(cancelRecord);
  }

  function invalidate(name, id) {
    syncSession();
    if (!RESOURCE_NAMES.has(name)) return false;
    const record = recordFor(name, id);
    if (!record) return false;
    const owner = sessionOwner;
    const generation = sessionGeneration;
    cancelRecord(record);
    record.value = null;
    record.updatedAt = 0;
    record.status = 'idle';
    record.error = null;
    notify(name, name === 'index' || name === 'recent' ? undefined : id, owner, generation);
    return true;
  }

  function queryResultError(result, fallback) {
    if (!result) return makeError(fallback);
    if (result.error) return result.error instanceof Error ? result.error : makeError(errorMessage(result.error) || fallback);
    if (result.data == null && !Array.isArray(result.data)) return makeError(fallback);
    return null;
  }

  function runOperation(record, owner, generation, worker, name, id) {
    const token = {};
    const controller = newAbortController();
    let timedOut = false;
    let timer = null;
    record.status = 'loading';
    record.error = null;
    record.controller = controller;
    record.owner = owner;
    record.generation = generation;
    record.token = token;

    const timeoutError = makeError('Tempo esgotado ao carregar dados da coleta (15s).', 'CollectionDataTimeoutError');
    const operation = (async () => {
      let workerPromise;
      try {
        workerPromise = Promise.resolve().then(() => worker(controller.signal));
        const timeoutPromise = new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            try { controller.abort(); } catch (error) { /* noop */ }
            reject(timeoutError);
          }, OPERATION_TIMEOUT_MS);
        });
        const value = await Promise.race([workerPromise, timeoutPromise]);
        if (controller.signal.aborted || !isCurrent(owner, generation) || record.token !== token) return null;
        record.value = value;
        record.updatedAt = Date.now();
        record.status = 'ready';
        record.error = null;
        notify(name, id, owner, generation);
        return value;
      } catch (error) {
        if (timer) clearTimeout(timer);
        if (!timedOut && (controller.signal.aborted || isAbortError(error))) return null;
        if (!isCurrent(owner, generation) || record.token !== token) return null;
        record.status = 'error';
        record.error = error instanceof Error ? error : makeError(errorMessage(error) || 'Não foi possível carregar os dados da coleta.');
        notify(name, id, owner, generation);
        throw record.error;
      } finally {
        if (timer) clearTimeout(timer);
        /* Um cancelPending/reset pode já ter removido a operação do record. */
        if (record.token === token) {
          record.promise = null;
          record.controller = null;
          record.owner = null;
          record.generation = 0;
          record.token = null;
          if (record.status === 'loading') record.status = hasCachedValue(record) ? 'ready' : 'idle';
        }
      }
    })();
    record.promise = operation;
    notify(name, id, owner, generation);
    return operation;
  }

  function loadRecord(name, id, force, worker, options = {}) {
    syncSession();
    const record = recordFor(name, id);
    if (!record) return Promise.reject(makeError('Recurso inválido ou identificador ausente.'));
    if (record.promise) return record.promise;
    if (!force && record.status === 'error') return Promise.reject(record.error || makeError('A última tentativa falhou; use force:true para tentar novamente.'));
    if (!force && record.status === 'ready' && (options.ttl === false || fresh(record))) return Promise.resolve(record.value);
    if (!force && record.status === 'loading' && record.promise) return record.promise;

    const owner = sessionOwner;
    const generation = sessionGeneration;
    return runOperation(record, owner, generation, worker, name, id);
  }

  function requireProfile() {
    const profile = getProfile();
    if (!profile?.id) throw makeError('Sessão necessária para consultar dados da coleta.', 'CollectionDataAuthError');
    return profile;
  }

  function indexSnapshot(row) {
    return {
      id: row?.id,
      name: row?.name || '',
      tipo: row?.tipo || '',
      status: row?.status || 'rascunho',
      archivedAt: row?.archived_at || null,
      formStarted: row?.form_started === true,
      teamIds: (row?.survey_team || []).map(member => member?.researcher_id).filter(Boolean),
    };
  }

  function visibleToCollector(snapshot, profile) {
    if (!snapshot?.id || snapshot.archivedAt) return false;
    if (isTestProfile(profile)) {
      return ['rascunho', 'campo'].includes(snapshot.status) && snapshot.formStarted === true;
    }
    return snapshot.status === 'campo' && snapshot.teamIds.includes(profileId(profile));
  }

  async function fetchIndex(signal) {
    const profile = requireProfile();
    const client = getClient();
    if (!client?.from) throw makeError('Cliente Supabase indisponível.', 'CollectionDataClientError');
    const rows = [];
    const seen = new Set();
    for (let from = 0; from < MAX_INDEX_ROWS; from += INDEX_PAGE_SIZE) {
      let query = client.from('surveys').select('id,name,tipo,status,form_started,archived_at,survey_team(researcher_id)');
      query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      query = query.range(from, from + INDEX_PAGE_SIZE - 1);
      const result = await awaitQuery(query, signal);
      const error = queryResultError(result, 'Não foi possível consultar o índice de pesquisas.');
      if (error) throw error;
      const page = Array.isArray(result.data) ? result.data : [];
      for (const row of page) {
        if (!row?.id || seen.has(String(row.id))) continue;
        seen.add(String(row.id));
        const snapshot = indexSnapshot(row);
        if (visibleToCollector(snapshot, profile)) rows.push(snapshot);
      }
      if (page.length < INDEX_PAGE_SIZE) return rows;
    }
    throw makeError('O índice de pesquisas excedeu o limite seguro de leitura.');
  }

  function questionRowsFrom(row) {
    return (row?.survey_questions || []).slice().sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0));
  }

  function surveyAuthorized(snapshot, profile) {
    if (!snapshot?.id || snapshot.archivedAt) return false;
    if (isTestProfile(profile)) {
      return ['rascunho', 'campo'].includes(snapshot.status) && snapshot.formStarted === true;
    }
    return snapshot.status === 'campo' && Array.isArray(snapshot.teamIds) && snapshot.teamIds.includes(profileId(profile));
  }

  async function fetchSurvey(id, signal) {
    const profile = requireProfile();
    const client = getClient();
    if (!client?.from) throw makeError('Cliente Supabase indisponível.', 'CollectionDataClientError');
    if (id == null || String(id) === '') throw makeError('Identificador de pesquisa ausente.');

    let result = await awaitQuery(client.from('surveys').select(getJoinSelect('full')).eq('id', id).single(), signal);
    if (result?.error && /survey_question_fields|schema cache|relation .* does not exist/i.test(errorMessage(result.error))) {
      result = await awaitQuery(client.from('surveys').select(getJoinSelect('legacy')).eq('id', id).single(), signal);
    }
    const resultError = queryResultError(result, 'Pesquisa não encontrada.');
    if (resultError) throw resultError;
    const row = result.data;
    if (!row) throw makeError('Pesquisa não encontrada.');

    if (!visibleToCollector(indexSnapshot(row), profile)) {
      throw makeError('Esta pesquisa não está disponível para o seu perfil.', 'CollectionDataAuthorizationError');
    }
    const questionRows = questionRowsFrom(row);
    const loadOptions = getHelper('loadSurveyQuestionOptions');
    const attachOptions = getHelper('attachSurveyQuestionOptions');
    const toSnapshot = getHelper('surveyRowToSnapshot');
    if (!loadOptions || !attachOptions || !toSnapshot) {
      throw makeError('Helpers de questionário indisponíveis para carregar a pesquisa completa.', 'CollectionDataDependencyError');
    }
    const optionMap = await loadOptions(questionRows, { signal });
    attachOptions([row], optionMap);
    const snapshot = toSnapshot(row, questionRows, [], []);
    if (!surveyAuthorized(snapshot, profile)) {
      throw makeError('Esta pesquisa não está disponível para o seu perfil.', 'CollectionDataAuthorizationError');
    }
    return snapshot;
  }

  function previousFromRow(row) {
    return row ? {
      id: row.id,
      surveyId: row.survey_id,
      researcherId: row.researcher_id,
      status: row.status || 'valid',
      lat: Number(row.lat),
      lng: Number(row.lng),
      ts: row.occurred_at ? new Date(row.occurred_at).getTime() : NaN,
    } : null;
  }

  async function fetchPrevious(id, signal) {
    const profile = requireProfile();
    const client = getClient();
    if (!client?.from) throw makeError('Cliente Supabase indisponível.', 'CollectionDataClientError');
    if (id == null || String(id) === '') throw makeError('Identificador de pesquisa ausente.');
    let query = client.from('collection_events')
      .select('id,survey_id,researcher_id,status,lat,lng,occurred_at')
      .eq('survey_id', id)
      .eq('researcher_id', profile.id)
      .neq('status', 'rejected')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);
    const result = await awaitQuery(query, signal);
    const error = queryResultError(result, 'Não foi possível carregar a coleta anterior.');
    if (error) throw error;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    const previous = previousFromRow(row || null);
    if (previous && (!previous.id || !Number.isFinite(previous.lat) || !Number.isFinite(previous.lng) || !Number.isFinite(previous.ts))) {
      throw makeError('Dados inválidos na coleta anterior. Não foi possível conferir a distância.');
    }
    return previous;
  }

  function recentFromRow(row) {
    return {
      id: row?.id,
      surveyId: row?.survey_id,
      researcherId: row?.researcher_id,
      cota: row?.quota_label || '',
      ts: row?.occurred_at ? new Date(row.occurred_at).getTime() : NaN,
      synced: row?.synced !== false,
      status: row?.status || 'valid',
      rejectReason: row?.reject_reason || null,
      calibration: row?.is_calibration === true,
    };
  }

  async function fetchRecent(signal) {
    const profile = requireProfile();
    const client = getClient();
    if (!client?.from) throw makeError('Cliente Supabase indisponível.', 'CollectionDataClientError');
    const query = client.from('collection_events')
      .select('id,survey_id,researcher_id,quota_label,occurred_at,synced,status,reject_reason,is_calibration')
      .eq('researcher_id', profile.id)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(6);
    const result = await awaitQuery(query, signal);
    const error = queryResultError(result, 'Não foi possível carregar o histórico recente.');
    if (error) throw error;
    if (!Array.isArray(result.data)) throw makeError('Retorno inválido ao carregar o histórico recente.');
    return result.data.slice(0, 6).map(recentFromRow);
  }

  async function fetchQuotas(id, signal) {
    requireProfile();
    const client = getClient();
    if (!client?.rpc) throw makeError('Cliente Supabase indisponível.', 'CollectionDataClientError');
    if (id == null || String(id) === '') throw makeError('Identificador de pesquisa ausente.');
    const query = client.rpc('survey_quota_counts', { p_survey_id: id });
    const result = await awaitQuery(query, signal);
    const error = queryResultError(result, 'Não foi possível carregar o progresso das cotas.');
    if (error) throw error;
    if (!Array.isArray(result.data)) throw makeError('Retorno inválido ao carregar o progresso das cotas.');
    const map = {};
    result.data.forEach(row => {
      if (row?.quota_label == null) return;
      const value = Number(row.valid_count);
      if (row.valid_count == null || !Number.isSafeInteger(value) || value < 0) {
        throw makeError('Progresso inválido das cotas. Atualize antes de iniciar a coleta.');
      }
      map[row.quota_label] = value;
    });
    return map;
  }

  function loadSurvey(id, options = {}) {
    const key = String(id == null ? '' : id);
    return loadRecord('survey', key, options.force === true, fetchSurvey.bind(null, id), { ttl: true });
  }

  function loadPrevious(id, options = {}) {
    const key = String(id == null ? '' : id);
    return loadRecord('previous', key, options.force === true, fetchPrevious.bind(null, id), { ttl: false });
  }

  function loadRecent(options = {}) {
    return loadRecord('recent', undefined, options.force === true, fetchRecent, { ttl: false });
  }

  function loadQuotas(id, options = {}) {
    const key = String(id == null ? '' : id);
    return loadRecord('quotas', key, options.force === true, fetchQuotas.bind(null, id), { ttl: false });
  }

  function ensureIndex() {
    return loadRecord('index', undefined, false, fetchIndex, { ttl: true });
  }

  function surveys() {
    syncSession();
    return Array.isArray(indexRecord.value) ? indexRecord.value.slice() : [];
  }

  function survey(id) {
    syncSession();
    const record = records.survey.get(String(id == null ? '' : id));
    return record && hasCachedValue(record) ? record.value : null;
  }

  function previous(id) {
    syncSession();
    const record = records.previous.get(String(id == null ? '' : id));
    return record && hasCachedValue(record) ? record.value : null;
  }

  function recent() {
    syncSession();
    return Array.isArray(records.recent.value) ? records.recent.value.slice() : [];
  }

  function quotas(id) {
    syncSession();
    const record = records.quotas.get(String(id == null ? '' : id));
    return record && hasCachedValue(record) ? record.value : null;
  }

  function state(name, id) {
    syncSession();
    if (!RESOURCE_NAMES.has(name)) return { status: 'idle', error: null };
    return publicState(recordFor(name, id));
  }

  function setOnChange(fn) {
    onChange = typeof fn === 'function' ? fn : null;
    return () => {
      if (onChange === fn) onChange = null;
    };
  }

  function metadata() {
    syncSession();
    return {
      cacheTtlMs: CACHE_TTL_MS,
      operationTimeoutMs: OPERATION_TIMEOUT_MS,
      indexPageSize: INDEX_PAGE_SIZE,
      sessionGeneration,
      resources: Array.from(RESOURCE_NAMES),
    };
  }

  const api = {
    setOnChange,
    reset,
    ensureIndex,
    surveys,
    loadSurvey,
    survey,
    loadPrevious,
    previous,
    loadRecent,
    recent,
    loadQuotas,
    quotas,
    state,
    invalidate,
    cancelPending,
    metadata,
  };

  root.PP_COLLECTION_DATA = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
