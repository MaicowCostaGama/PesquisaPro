/* PesquisaPro — dados leves da navegação administrativa.
 *
 * Este módulo só lê as duas RPCs administrativas dedicadas. Ele não conhece
 * nem preenche os stores completos da aplicação; a RLS continua sendo aplicada
 * pelo Supabase para a sessão autenticada.
 */
(function (root) {
  'use strict';

  var RESOURCE_NAMES = ['surveys', 'overview'];
  var RESOURCE_SET = { surveys: true, overview: true };
  var ADMIN_ROLES = { admin: true, admpro: true, coord: true, gerente: true };
  var PAGE_SIZE = 100;
  var MAX_ROWS = 10000;
  var CACHE_TTL_MS = 30000;
  var TIMEOUT_MS = 15000;
  var NAVIGATION_ROUTES = {
    dashboard: true,
    surveys: true,
    'surveys-done': true,
    'surveys-archived': true,
  };
  var RESOURCE_ROUTES = {
    surveys: { dashboard: true, surveys: true, 'surveys-done': true, 'surveys-archived': true },
    overview: { dashboard: true },
  };
  var MISSING_RPC_FILE = 'navegacao-admin-leve-20261029.sql';

  var sessionOwner = null;
  var sessionStarted = false;
  var generation = 0;
  var activeRoute = '';
  var resources = createResourceMap();

  function createResource(name) {
    return {
      name: name,
      status: 'idle',
      error: null,
      loadedAt: 0,
      value: name === 'surveys' ? [] : null,
      promise: null,
      controller: null,
      timer: null,
      token: null,
    };
  }

  function createResourceMap() {
    return {
      surveys: createResource('surveys'),
      overview: createResource('overview'),
    };
  }

  function currentProfile() {
    /* CURRENT_PROFILE e sb podem ser lets globais do app.js, não propriedades
       de window; os fallbacks tornam o módulo carregável em VM/mock isolado. */
    try {
      if (typeof CURRENT_PROFILE !== 'undefined') return CURRENT_PROFILE;
    } catch (error) {
      /* binding global ainda não disponível */
    }
    return root && root.CURRENT_PROFILE ? root.CURRENT_PROFILE : null;
  }

  function supabaseClient() {
    try {
      if (typeof sb !== 'undefined' && sb) return sb;
    } catch (error) {
      /* sb pode não existir no teste isolado */
    }
    if (root && root.sb) return root.sb;
    if (root && root.PP_SUPABASE_CLIENT) return root.PP_SUPABASE_CLIENT;
    return null;
  }

  function allowedProfile(profile) {
    return !!(profile && profile.id != null && ADMIN_ROLES[profile.role]);
  }

  function profileIsCurrent(profile) {
    return currentProfile() === profile;
  }

  function resourceName(name) {
    return RESOURCE_SET[name] ? name : null;
  }

  function resourceOrNull(name) {
    var key = resourceName(name);
    return key ? resources[key] : null;
  }

  function emptyController() {
    var aborted = false;
    var listeners = [];
    var signal = {
      get aborted() { return aborted; },
      addEventListener: function (type, listener) {
        if (type !== 'abort' || typeof listener !== 'function') return;
        if (aborted) {
          listener();
          return;
        }
        listeners.push(listener);
      },
      removeEventListener: function (type, listener) {
        if (type !== 'abort') return;
        listeners = listeners.filter(function (item) { return item !== listener; });
      },
    };
    return {
      signal: signal,
      abort: function () {
        if (aborted) return;
        aborted = true;
        listeners.slice().forEach(function (listener) {
          try { listener(); } catch (error) { /* cancelamento não quebra o store */ }
        });
        listeners = [];
      },
    };
  }

  function makeController() {
    return typeof AbortController === 'function' ? new AbortController() : emptyController();
  }

  function applyAbortSignal(query, signal) {
    if (!query || !signal || typeof query.abortSignal !== 'function') return query;
    var applied = query.abortSignal(signal);
    return applied === undefined ? query : applied;
  }

  function messageOf(error) {
    if (!error) return '';
    return String(error.message || error.error_description || error.details || error);
  }

  function isMissingRpc(error) {
    var code = String(error && error.code || '').toUpperCase();
    var message = messageOf(error).toUpperCase();
    return code === 'PGRST202' || message.indexOf('PGRST202') >= 0 || message.indexOf('COULD NOT FIND FUNCTION') >= 0;
  }

  function rpcFailure(error, rpcName) {
    if (isMissingRpc(error)) {
      return new Error('A RPC ' + rpcName + ' não está disponível (PGRST202). Faça o deploy de ' + MISSING_RPC_FILE + ' antes de carregar a navegação administrativa.');
    }
    var text = messageOf(error);
    return new Error(text || ('Não foi possível consultar ' + rpcName + '.'));
  }

  function timeoutFailure() {
    return new Error('A consulta da navegação administrativa demorou mais que o limite de 15 segundos. Tente novamente.');
  }

  function canceledFailure() {
    return new Error('A consulta da navegação administrativa foi cancelada.');
  }

  function queryRpc(name, args, controller) {
    var client = supabaseClient();
    if (!client || typeof client.rpc !== 'function') {
      return Promise.reject(new Error('O cliente Supabase não está disponível para carregar a navegação administrativa.'));
    }
    var query;
    try {
      query = args === undefined ? client.rpc(name) : client.rpc(name, args);
      query = applyAbortSignal(query, controller.signal);
    } catch (error) {
      return Promise.reject(rpcFailure(error, name));
    }
    var resultPromise = Promise.resolve(query).then(function (result) {
      if (controller.signal.aborted) throw canceledFailure();
      if (result && result.error) throw rpcFailure(result.error, name);
      if (Array.isArray(result)) return result;
      if (!result || !Object.prototype.hasOwnProperty.call(result, 'data')) {
        throw new Error('A RPC ' + name + ' retornou uma resposta inválida.');
      }
      return result.data;
    });
    if (!controller.signal || typeof controller.signal.addEventListener !== 'function') return resultPromise;
    var canceled = new Promise(function (resolve, reject) {
      controller.signal.addEventListener('abort', function () { reject(canceledFailure()); }, { once: true });
    });
    return Promise.race([resultPromise, canceled]);
  }

  function withTimeout(task, controller, resource) {
    var timer;
    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        reject(timeoutFailure());
        try { controller.abort(); } catch (error) { /* noop */ }
      }, TIMEOUT_MS);
    });
    resource.timer = timer;
    return Promise.race([
      Promise.resolve().then(task),
      timeout,
    ]).then(function (value) {
      clearTimeout(timer);
      if (resource.timer === timer) resource.timer = null;
      return value;
    }, function (error) {
      clearTimeout(timer);
      if (resource.timer === timer) resource.timer = null;
      throw error;
    });
  }

  function finiteNonNegative(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error('A navegação administrativa retornou ' + label + ' inválido.');
    }
    return value;
  }

  function nonNegativeCount(value, label) {
    finiteNonNegative(value, label);
    if (!Number.isInteger(value)) throw new Error('A navegação administrativa retornou ' + label + ' não inteiro.');
    return value;
  }

  function requiredText(value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('A navegação administrativa retornou ' + label + ' inválido.');
    }
    return value;
  }

  function nullableDate(value, label) {
    if (value == null) return null;
    return requiredText(value, label);
  }

  function requiredBoolean(value, label) {
    if (typeof value !== 'boolean') throw new Error('A navegação administrativa retornou ' + label + ' inválido.');
    return value;
  }

  function surveySummary(row, index) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('A página de pesquisas retornou uma linha inválida na posição ' + index + '.');
    }
    var id = requiredText(row.id, 'id da pesquisa');
    var name = requiredText(row.name, 'nome da pesquisa');
    var status = requiredText(row.status, 'status da pesquisa');
    var summary = {
      id: id,
      name: name,
      status: status,
      archivedAt: nullableDate(row.archived_at, 'archived_at'),
      createdAt: nullableDate(row.created_at, 'created_at'),
      pop: finiteNonNegative(row.populacao, 'populacao'),
      err: finiteNonNegative(row.margem_erro, 'margem_erro'),
      conf: finiteNonNegative(row.nivel_confianca, 'nivel_confianca'),
      prop: finiteNonNegative(row.proporcao, 'proporcao'),
      formStarted: requiredBoolean(row.form_started, 'form_started'),
      formApprovalRequired: requiredBoolean(row.form_approval_required, 'form_approval_required'),
      questionCount: nonNegativeCount(row.question_count, 'question_count'),
      teamCount: nonNegativeCount(row.team_count, 'team_count'),
      collected: nonNegativeCount(row.valid_count, 'valid_count'),
      summaryOnly: true,
    };
    return summary;
  }

  function surveyPage(page, offset) {
    if (!Array.isArray(page)) throw new Error('A RPC admin_navigation_surveys_v1 retornou uma página inválida.');
    if (page.length > PAGE_SIZE) throw new Error('A RPC admin_navigation_surveys_v1 retornou mais de 100 linhas em uma página.');
    return page.map(function (row, index) { return surveySummary(row, offset + index); });
  }

  function readSurveyPages(controller, resource) {
    var summaries = [];
    var offset = 0;
    function next() {
      if (controller.signal.aborted) return Promise.reject(canceledFailure());
      if (offset >= MAX_ROWS) {
        return Promise.reject(new Error('A lista de pesquisas excede o limite seguro de 10000 linhas; nenhuma página parcial foi aplicada.'));
      }
      var pageOffset = offset;
      return queryRpc('admin_navigation_surveys_v1', { p_offset: pageOffset, p_limit: PAGE_SIZE }, controller).then(function (page) {
        var parsed = surveyPage(page, pageOffset);
        summaries = summaries.concat(parsed);
        offset += page.length;
        if (page.length < PAGE_SIZE) return summaries;
        if (offset >= MAX_ROWS) {
          throw new Error('A lista de pesquisas atingiu o limite de 10000 linhas sem uma página final; nenhuma página parcial foi aplicada.');
        }
        return next();
      });
    }
    return next();
  }

  function validDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
  }

  function overviewValue(data, owner) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('A RPC admin_navigation_overview_v1 não retornou um objeto válido.');
    }
    var daily = data.daily_counts;
    if (!Array.isArray(daily)) throw new Error('A RPC admin_navigation_overview_v1 retornou daily_counts inválido.');
    var pendingSignups;
    if (data.pending_signups === null && (owner.role === 'coord' || owner.role === 'gerente')) {
      pendingSignups = null;
    } else {
      pendingSignups = nonNegativeCount(data.pending_signups, 'pending_signups');
    }
    if (typeof data.company_signed !== 'boolean') {
      throw new Error('A navegação administrativa retornou company_signed inválido.');
    }
    var result = {
      active_researchers: nonNegativeCount(data.active_researchers, 'active_researchers'),
      active_clients: nonNegativeCount(data.active_clients, 'active_clients'),
      pending_signups: pendingSignups,
      pending_contracts: nonNegativeCount(data.pending_contracts, 'pending_contracts'),
      valid_interviews: nonNegativeCount(data.valid_interviews, 'valid_interviews'),
      company_signed: data.company_signed,
      daily_counts: daily.map(function (item, index) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || !validDay(item.day)) {
          throw new Error('A RPC admin_navigation_overview_v1 retornou um dia inválido na posição ' + index + '.');
        }
        return { day: item.day, count: nonNegativeCount(item.count, 'count diário') };
      }),
    };
    return result;
  }

  function isCurrent(resource, owner, resourceGeneration, token) {
    return profileIsCurrent(owner) && sessionOwner === owner && generation === resourceGeneration && resources[resource.name] === resource && resource.token === token;
  }

  function publicValue(name, value) {
    if (name === 'surveys') return value.map(function (row) { return Object.assign({}, row); });
    if (!value) return null;
    return {
      active_researchers: value.active_researchers,
      active_clients: value.active_clients,
      pending_signups: value.pending_signups,
      pending_contracts: value.pending_contracts,
      valid_interviews: value.valid_interviews,
      company_signed: value.company_signed,
      daily_counts: value.daily_counts.map(function (item) { return { day: item.day, count: item.count }; }),
    };
  }

  function clearResourceTimer(resource) {
    if (resource && resource.timer != null) {
      clearTimeout(resource.timer);
      resource.timer = null;
    }
  }

  function abortResource(resource) {
    if (!resource) return;
    clearResourceTimer(resource);
    if (resource.controller) {
      try { resource.controller.abort(); } catch (error) { /* noop */ }
    }
    resource.controller = null;
    resource.token = null;
    resource.promise = null;
  }

  function resetInternal() {
    generation += 1;
    Object.keys(resources).forEach(function (name) { abortResource(resources[name]); });
    resources = createResourceMap();
    activeRoute = '';
  }

  function reset() {
    resetInternal();
    sessionOwner = null;
    sessionStarted = false;
  }

  function syncSession() {
    var profile = currentProfile();
    if (!sessionStarted) {
      sessionStarted = true;
      sessionOwner = profile;
    } else if (sessionOwner !== profile) {
      resetInternal();
      sessionOwner = profile;
    }
    return profile;
  }

  function eligibleSession() {
    return allowedProfile(syncSession());
  }

  function ensureResource(name) {
    var key = resourceName(name);
    if (!key) return Promise.reject(new Error('Recurso de navegação administrativa inválido: ' + String(name) + '.'));
    if (!eligibleSession()) return Promise.resolve(null);
    var resource = resources[key];
    if (resource.status === 'loading' && resource.promise) return resource.promise;
    if (resource.status === 'error') return Promise.resolve(null);
    if (resource.status === 'ready' && Date.now() - resource.loadedAt < CACHE_TTL_MS) {
      return Promise.resolve(publicValue(key, resource.value));
    }

    var owner = sessionOwner;
    var resourceGeneration = generation;
    var token = {};
    var controller = makeController();
    resource.status = 'loading';
    resource.error = null;
    resource.controller = controller;
    resource.token = token;

    var operation = (async function () {
      try {
        var value;
        if (key === 'surveys') {
          value = await withTimeout(function () { return readSurveyPages(controller, resource); }, controller, resource);
        } else {
          value = overviewValue(await withTimeout(function () {
            return queryRpc('admin_navigation_overview_v1', undefined, controller);
          }, controller, resource), owner);
        }
        if (!isCurrent(resource, owner, resourceGeneration, token)) return null;
        resource.value = value;
        resource.status = 'ready';
        resource.error = null;
        resource.loadedAt = Date.now();
        return publicValue(key, value);
      } catch (error) {
        if (!isCurrent(resource, owner, resourceGeneration, token)) return null;
        resource.status = 'error';
        resource.error = messageOf(error) || 'Não foi possível carregar os dados da navegação administrativa.';
        resource.loadedAt = 0;
        return null;
      } finally {
        clearResourceTimer(resource);
        if (isCurrent(resource, owner, resourceGeneration, token)) {
          resource.controller = null;
          resource.token = null;
          resource.promise = null;
        }
      }
    })();
    resource.promise = operation;
    return operation;
  }

  function ensure(name) {
    return ensureResource(name);
  }

  function state(name) {
    syncSession();
    var resource = resourceOrNull(name);
    if (!resource) return { status: 'idle', error: null, loadedAt: 0 };
    return { status: resource.status, error: resource.error || null, loadedAt: resource.loadedAt || 0 };
  }

  function rows() {
    syncSession();
    var resource = resources.surveys;
    return resource && Array.isArray(resource.value) ? publicValue('surveys', resource.value) : [];
  }

  function overview() {
    syncSession();
    var resource = resources.overview;
    return resource && resource.value ? publicValue('overview', resource.value) : null;
  }

  function invalidate(name) {
    syncSession();
    var keys = name == null ? RESOURCE_NAMES : [resourceName(name)];
    var changed = false;
    keys.forEach(function (key) {
      if (!key) return;
      var previous = resources[key];
      abortResource(previous);
      resources[key] = createResource(key);
      changed = true;
    });
    return changed;
  }

  function retry(name) {
    var key = resourceName(name);
    if (!key || !eligibleSession()) return Promise.resolve(null);
    if (resources[key].status === 'loading' && resources[key].promise) return resources[key].promise;
    invalidate(key);
    return ensureResource(key);
  }

  function onNavigate(key, previousKey) {
    var route = String(key == null ? '' : key);
    syncSession();
    if (previousKey != null && String(previousKey) === route) return;
    activeRoute = route;
    if (!NAVIGATION_ROUTES[route] || !allowedProfile(sessionOwner)) return;
    RESOURCE_NAMES.forEach(function (name) {
      var resource = resources[name];
      if (!RESOURCE_ROUTES[name][route] || resource.status !== 'ready') return;
      if (Date.now() - resource.loadedAt < CACHE_TTL_MS) return;
      /* O carregamento é iniciado somente para o recurso compatível com a
         rota atual; nenhum go/render é chamado por este módulo. */
      resource.loadedAt = 0;
      ensureResource(name);
    });
  }

  reset();
  root.PP_ADMIN_NAV_DATA = {
    ensure: ensure,
    ready: function (name) { return state(name).status === 'ready'; },
    state: state,
    rows: rows,
    overview: overview,
    reset: reset,
    invalidate: invalidate,
    retry: retry,
    onNavigate: onNavigate,
    /* Metadados não são necessários para a integração, mas ajudam testes e
       diagnóstico sem expor referências internas. */
    cacheTtlMs: CACHE_TTL_MS,
    timeoutMs: TIMEOUT_MS,
  };
}(typeof window !== 'undefined' ? window : globalThis));
