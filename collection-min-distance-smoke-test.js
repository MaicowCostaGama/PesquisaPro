const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
const data=fs.readFileSync('collection-data.js','utf8');
const loading=fs.readFileSync('collection-loading-ui.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const sql=fs.readFileSync('deploy/distancia-minima-coleta-por-pesquisa-20261104.sql','utf8');
const html=fs.readFileSync('app.html','utf8');

for(const token of [
  'minimumCollectionDistanceM:15',
  'minimum_collection_distance_m',
  'surveyMinimumDistanceMeters',
  'wizMinimumDistanceMarkup',
  'wiz-minimum-distance-input',
  'auditMinimumDistanceInput',
  'saveAuditMinimumDistance',
  'save_survey_minimum_collection_distance',
  'surveyMinimumDistanceMeters(d)===0',
  'acollectTooCloseMessage',
  'Outra coleta válida desta pesquisa foi registrada nessa área enquanto você entrevistava',
  'Nenhuma coleta oficial foi gravada; as respostas permanecem abertas',
  'acollectUploadRecording(eventId,serverPendingAudio)',
  "select('status,reject_reason')",
  "sb.rpc('validate_collection_start_with_distance'",
  'A regra de distância da pesquisa ainda não está instalada no servidor',
  'Coleta de teste autorizada — calibração'
])assert(app.includes(token),`app.js sem ${token}`);
assert(!app.includes('distance<15'),'frontend ainda fixa o limite de 15 m');
assert(!app.includes('distance < 15'),'frontend ainda fixa o limite de 15 m');
assert(!app.includes('COLLECT_TOO_CLOSE_MESSAGE'),'mensagem fixa antiga continua no frontend');

assert(data.includes(".eq('survey_id', id)")&&data.includes(".eq('status', 'valid')")&&data.includes(".eq('is_calibration', false)"),'consulta opcional anterior não corresponde a toda a equipe e calibrações');
const previousQuery=(data.match(/async function fetchPrevious\(id, signal\) \{[\s\S]*?\n  \}/)||[])[0]||'';
assert(previousQuery&&!previousQuery.includes(".eq('researcher_id', profile.id)"),'consulta de evento anterior ainda restringe o pesquisador');
assert(loading.includes("['survey','quotas'].every")&&!loading.includes("stage('previous','Verificação da coleta anterior')"),'carga inicial ainda depende de baixar o evento anterior');
assert(!loading.includes('loader.loadPrevious(id,{force:true})'),'carga inicial ainda baixa o evento anterior');
assert(css.includes('.wiz-minimum-distance-card')&&css.includes('.audit-minimum-distance'),'CSS dos controles de distância ausente');

for(const token of [
  'add column if not exists minimum_collection_distance_m integer',
  'set minimum_collection_distance_m = 15',
  'check (minimum_collection_distance_m between 0 and 10000)',
  'save_survey_minimum_collection_distance',
  'validate_collection_start',
  'validate_collection_start_with_distance',
  'enforce_collection_location_integrity',
  'asin(least(1.0, sin(v_angular_radius) / v_cos_lat))',
  'status = \'valid\'',
  'is_calibration = false',
  '_collection_event_is_test',
  "'collection-distance:survey:' || new.survey_id::text",
  'new.duration_seconds >= coalesce(v_min_duration, 0)',
  'new.duration_seconds is null or new.duration_seconds < coalesce(v_min_duration, 0)',
  'Duração da coleta não foi informada',
  "old.status = 'valid' or new.status <> 'valid'",
  'if public.is_staff() then return new; end if;',
  'auth.uid() is null or new.researcher_id <> auth.uid()',
  'before insert or update on public.collection_events',
  'create index if not exists collection_events_survey_valid_location_distance_idx',
  'revoke all on function public._survey_distance_to_nearest_valid_collection',
  'grant execute on function public.save_survey_minimum_collection_distance(uuid,integer) to authenticated',
  'grant execute on function public.validate_collection_start(uuid,double precision,double precision) to authenticated',
  'grant execute on function public.validate_collection_start_with_distance(uuid,double precision,double precision) to authenticated',
  'begin;',
  'commit;'
])assert(sql.includes(token),`SQL sem ${token}`);
const distanceFunction=sql.slice(sql.indexOf('create or replace function public._survey_distance_to_nearest_valid_collection'),sql.indexOf('revoke all on function public._survey_distance_to_nearest_valid_collection'));
assert(/returns numeric\s+language plpgsql\s+volatile\s+security definer/i.test(distanceFunction),'helper de distância precisa ser volatile para enxergar inserções após esperar a trava');
assert(!/drop\s+table|drop\s+column|truncate|delete\s+from/i.test(sql),'migration contém operação destrutiva');
assert(!/\bresearcher_id\s*=\s*auth\.uid\(\)/i.test(sql),'regra SQL ainda limita a distância ao próprio pesquisador');
assert(!sql.slice(sql.indexOf('create or replace function public.validate_collection_start('),sql.indexOf('-- RPC nova para o frontend')).includes('pg_advisory_xact_lock'),'prévia de início não deve serializar a equipe');

const distanceHelper=app.slice(app.indexOf('function surveyMinimumDistanceMeters'),app.indexOf('function wizMinimumDistanceMarkup'));
const orientationStart=app.indexOf('function surveyInitialOrientationDistanceText');
const orientationEnd=app.indexOf('async function copySurveyInviteLink',orientationStart);
assert(distanceHelper&&orientationStart>=0&&orientationEnd>orientationStart,'helpers de configuração/orientação não encontrados');
const runtime={fmtDist:value=>`${value} m`,surveyCommunicationWithoutGroups:value=>String(value||''),surveyInvitationSiteUrl:()=> 'https://www.pesquisa-pro.com/app.html',surveyTrainingVideoUrl:()=> 'https://example.test/training'};
vm.runInNewContext(distanceHelper+'\n'+app.slice(orientationStart,orientationEnd),runtime);
const orientation=(distance,template='')=>runtime.surveyInitialOrientationWhatsappMessage({name:'Pesquisa exemplo',minimumCollectionDistanceM:distance},{name:'Pesquisador'},template);
const customLegacy='O sistema bloqueia o início se a nova coleta estiver a menos de 15 metros da coleta válida anterior desta mesma pesquisa. Coletas de pesquisas diferentes não entram nessa comparação.';
assert(orientation(120,customLegacy).includes('a menos de 120 m'),'orientação deve usar o valor configurado');
assert(orientation(120,customLegacy).includes('qualquer pesquisador'),'orientação deve esclarecer o escopo de equipe');
assert(!orientation(120,customLegacy).includes('15 metros'),'orientação legada não pode contradizer a configuração');
assert(orientation(0).includes('trava de distância mínima entre coletas está desativada'),'0 deve ser comunicado como desativação da trava');
assert(orientation(null).includes('a menos de 15 m'),'pesquisa antiga sem valor deve manter o padrão de 15 m');

console.log('Collection minimum distance smoke test: PASS — configuração 0–10.000 m, orientações dinâmicas, default 15 m, comparação server-side da equipe, exclusão de calibrações e carregamento inicial leve.');
