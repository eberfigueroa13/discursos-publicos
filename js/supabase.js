/* ============================================================
   supabase.js — Cliente Supabase + Capa de datos
   Reemplaza firebase.js
============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://drfqhkvppvteqwiycbjd.supabase.co';
const SUPABASE_ANON = 'sb_publishable_hEs_ro07hCvZXLFm_Gq88A_1kvfvqAE';

window._sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Helpers ── */
function _congId(){ return window._usr?.cong_id || ''; }

function _handleError(e, msg){
  console.error(msg, e);
  toast(msg + ': ' + (e?.message||'Error desconocido'), 'e');
}

/* ── CRUD generico ── */

// Cargar todos los registros de una tabla para esta congregacion
async function dbGetAll(tabla){
  const { data, error } = await _sb.from(tabla).select('*').eq('cong_id', _congId());
  if(error){ _handleError(error, 'Error cargando ' + tabla); return []; }
  return data || [];
}

// Upsert un registro
async function dbUpsert(tabla, row){
  if(!row.cong_id) row.cong_id = _congId();
  const { error } = await _sb.from(tabla).upsert(row, { onConflict: 'id' });
  if(error) _handleError(error, 'Error guardando en ' + tabla);
}

// Eliminar un registro
async function dbDelete(tabla, id){
  const { error } = await _sb.from(tabla).delete().eq('id', id).eq('cong_id', _congId());
  if(error) _handleError(error, 'Error eliminando de ' + tabla);
}

// Guardar documento unico (config)
async function dbUpsertSingle(tabla, row, conflictCol){
  if(!row.cong_id) row.cong_id = _congId();
  const { error } = await _sb.from(tabla).upsert(row, { onConflict: conflictCol||'cong_id' });
  if(error) _handleError(error, 'Error guardando ' + tabla);
}

/* ── Cargar todo ── */
async function dbLoadAll(cb){
  if(!_congId()){ if(cb)cb(); return; }
  syncBar(true, 'Cargando datos...');
  try {
    const [
      miCongr, cfg, disc, herm, rep, congsExt,
      privs, plan, hist, sal, carga, arr
    ] = await Promise.all([
      _sb.from('congregaciones').select('*').eq('id', _congId()).single(),
      _sb.from('config').select('*').eq('cong_id', _congId()).single(),
      _sb.from('discursos').select('*').eq('cong_id', _congId()),
      _sb.from('hermanos').select('*').eq('cong_id', _congId()),
      _sb.from('repertorio').select('*').eq('cong_id', _congId()),
      _sb.from('congregaciones_ext').select('*').eq('cong_id', _congId()),
      _sb.from('privilegios').select('*').eq('cong_id', _congId()),
      _sb.from('planificacion').select('*').eq('cong_id', _congId()),
      _sb.from('historial').select('*').eq('cong_id', _congId()),
      _sb.from('salidas').select('*').eq('cong_id', _congId()),
      _sb.from('carga_mensual').select('*').eq('cong_id', _congId()),
      _sb.from('arreglos').select('*').eq('cong_id', _congId()),
    ]);

    // miCongr -> D.miCongr
    if(miCongr.data){
      const mc = miCongr.data;
      D.miCongr = {
        nombre: mc.nombre||'', direccion: mc.direccion||'',
        dia: mc.dia||'6', horario: mc.horario||'',
        circuito: mc.circuito||'', mapsSalon: mc.maps_salon||'',
        coordNombre: mc.coord_nombre||'', coordTel: mc.coord_tel||'',
        coordEmail: mc.coord_email||'', avNombre: mc.av_nombre||'',
        avTel: mc.av_tel||'', avEmail: mc.av_email||'', obs: mc.obs||''
      };
    }

    // config -> D.config
    if(cfg.data){
      const c = cfg.data;
      D.config = {
        mes: c.mes||new Date().getMonth()+1,
        anio: c.anio||new Date().getFullYear(),
        congregacionExternaMes: c.congregacion_externa_mes||'',
        diasBloqueo: c.dias_bloqueo||365,
        discursosLocalesRequeridos: c.discursos_locales_requeridos||1,
        habraSalidasMes: c.habra_salidas_mes||'no',
        habraSCMes: c.habra_sc_mes||'no',
        scNombre: c.sc_nombre||'', scTel: c.sc_tel||'',
        scEmail: c.sc_email||'', scObs: c.sc_obs||'',
        plantillaCarta: c.plantilla_carta||'',
        plantillaWhatsApp: c.plantilla_whatsapp||''
      };
    }

    // Arrays
    D.discursos = (disc.data||[]).map(d => ({
      id: d.id, numero: d.numero, titulo: d.titulo,
      estado: d.estado, obs: d.obs||''
    }));
    D.locales = (herm.data||[]).map(h => ({
      id: h.id, nombre: h.nombre, nombramiento: h.nombramiento||'',
      telefono: h.telefono||'', puedeAfuera: h.puede_afuera||'si',
      puedeLocal: h.puede_local||'si', estado: h.estado||'Activo',
      obs: h.obs||'',
      privilegios: typeof h.privilegios==='string'?JSON.parse(h.privilegios||'[]'):(h.privilegios||[])
    }));
    D.repertorioLocal = (rep.data||[]).map(r => ({
      id: r.id, hermanoId: r.hermano_id||'',
      numDiscurso: r.num_discurso, titulo: r.titulo||'',
      puedeAfuera: r.puede_afuera||'si', puedeLocal: r.puede_local||'si',
      estado: r.estado||'Activo', obs: r.obs||''
    }));
    D.congregaciones = (congsExt.data||[]).map(c => ({
      id: c.id, nombre: c.nombre, direccion: c.direccion||'',
      dia: c.dia||'0', horario: c.horario||'',
      coordNombre: c.coord_nombre||'', coordTel: c.coord_tel||'',
      coordEmail: c.coord_email||'', obs: c.obs||''
    }));
    D.privilegios = (privs.data||[]).map(p => ({ id: p.id, nombre: p.nombre }));
    D.planificacion = (plan.data||[]).map(p => ({
      id: p.id, tipo: p.tipo||'', _origen: p.origen||'',
      _hermanoId: p.hermano_id||'', fecha: p.fecha||'',
      congregacion: p.congregacion||'', hermano: p.hermano||'',
      numDiscurso: p.num_discurso||'', titulo: p.titulo||'',
      confirmado: p.confirmado||'Por confirmar', obs: p.obs||''
    }));
    D.historial = (hist.data||[]).map(h => ({
      id: h.id, fecha: h.fecha||'', tipo: h.tipo||'',
      congregacion: h.congregacion||'', hermano: h.hermano||'',
      hermanoId: h.hermano_id||'', telefono: h.telefono||'',
      numDiscurso: h.num_discurso||'', titulo: h.titulo||'', obs: h.obs||''
    }));
    D.salidasRealizadas = (sal.data||[]).map(s => ({
      id: s.id, fecha: s.fecha||'', congregacion: s.congregacion||'',
      hermano: s.hermano||'', hermanoId: s.hermano_id||'',
      numDiscurso: s.num_discurso||'', titulo: s.titulo||'', obs: s.obs||''
    }));
    D.cargaMensual = (carga.data||[]).map(c => ({
      id: c.id, congregacion: c.congregacion||'', hermano: c.hermano||'',
      numDiscurso: c.num_discurso||'', telefono: c.telefono||'',
      mes: c.mes, anio: c.anio
    }));
    D.arreglos = (arr.data||[]).map(a => ({
      id: a.id, mes: a.mes, anio: a.anio,
      congregacion: a.congregacion_nombre||'',
      tipo: a.tipo||'entrada', estado: a.estado||'pendiente', obs: a.obs||''
    }));

    if(!D.privilegios.length)
      D.privilegios = _privilegiosDefault.map(n => ({ id: uid(), nombre: n }));

    syncBar(false);
    if(cb) cb();
  } catch(e) {
    syncBar(false);
    console.error('dbLoadAll error:', e);
    if(cb) cb();
  }
}

/* ── Guardar miCongr ── */
async function dbSaveMiCongr(){
  const mc = D.miCongr;
  await _sb.from('congregaciones').update({
    direccion: mc.direccion||'', dia: mc.dia||'6',
    horario: mc.horario||'', maps_salon: mc.mapsSalon||'',
    coord_nombre: mc.coordNombre||'', coord_tel: mc.coordTel||'',
    coord_email: mc.coordEmail||'', av_nombre: mc.avNombre||'',
    av_tel: mc.avTel||'', av_email: mc.avEmail||'', obs: mc.obs||''
  }).eq('id', _congId());
}

/* ── Guardar config ── */
async function dbSaveConfig(){
  const c = D.config;
  await dbUpsertSingle('config', {
    cong_id: _congId(), mes: c.mes, anio: c.anio,
    congregacion_externa_mes: c.congregacionExternaMes||'',
    dias_bloqueo: c.diasBloqueo||365,
    discursos_locales_requeridos: c.discursosLocalesRequeridos||1,
    habra_salidas_mes: c.habraSalidasMes||'no',
    habra_sc_mes: c.habraSCMes||'no',
    sc_nombre: c.scNombre||'', sc_tel: c.scTel||'',
    sc_email: c.scEmail||'', sc_obs: c.scObs||'',
    plantilla_carta: c.plantillaCarta||'',
    plantilla_whatsapp: c.plantillaWhatsApp||''
  });
}

/* ── Mapeo D.* -> tabla Supabase ── */
const _TBL = {
  discursos: { tabla:'discursos', toRow: d => ({ id:d.id, cong_id:_congId(), numero:d.numero, titulo:d.titulo, estado:d.estado||'Activo', obs:d.obs||'' }) },
  locales: { tabla:'hermanos', toRow: h => ({ id:h.id, cong_id:_congId(), nombre:h.nombre, nombramiento:h.nombramiento||'', telefono:h.telefono||'', puede_afuera:h.puedeAfuera||'si', puede_local:h.puedeLocal||'si', estado:h.estado||'Activo', obs:h.obs||'', privilegios:JSON.stringify(h.privilegios||[]) }) },
  repertorioLocal: { tabla:'repertorio', toRow: r => ({ id:r.id, cong_id:_congId(), hermano_id:r.hermanoId||null, num_discurso:r.numDiscurso||null, titulo:r.titulo||'', puede_afuera:r.puedeAfuera||'si', puede_local:r.puedeLocal||'si', estado:r.estado||'Activo', obs:r.obs||'' }) },
  congregaciones: { tabla:'congregaciones_ext', toRow: c => ({ id:c.id, cong_id:_congId(), nombre:c.nombre, direccion:c.direccion||'', dia:c.dia||'0', horario:c.horario||'', coord_nombre:c.coordNombre||'', coord_tel:c.coordTel||'', coord_email:c.coordEmail||'', obs:c.obs||'' }) },
  privilegios: { tabla:'privilegios', toRow: p => ({ id:p.id, cong_id:_congId(), nombre:p.nombre }) },
  planificacion: { tabla:'planificacion', toRow: p => ({ id:p.id, cong_id:_congId(), tipo:p.tipo||'', origen:p._origen||'', hermano_id:p._hermanoId||null, fecha:p.fecha||'', congregacion:p.congregacion||'', hermano:p.hermano||'', num_discurso:p.numDiscurso?String(p.numDiscurso):'', titulo:p.titulo||'', confirmado:p.confirmado||'Por confirmar', obs:p.obs||'' }) },
  historial: { tabla:'historial', toRow: h => ({ id:h.id, cong_id:_congId(), fecha:h.fecha||'', tipo:h.tipo||'', congregacion:h.congregacion||'', hermano:h.hermano||'', hermano_id:h.hermanoId||null, telefono:h.telefono||'', num_discurso:h.numDiscurso?String(h.numDiscurso):'', titulo:h.titulo||'', obs:h.obs||'' }) },
  salidasRealizadas: { tabla:'salidas', toRow: s => ({ id:s.id, cong_id:_congId(), fecha:s.fecha||'', congregacion:s.congregacion||'', hermano:s.hermano||'', hermano_id:s.hermanoId||null, num_discurso:s.numDiscurso?String(s.numDiscurso):'', titulo:s.titulo||'', obs:s.obs||'' }) },
  cargaMensual: { tabla:'carga_mensual', toRow: c => ({ id:c.id, cong_id:_congId(), congregacion:c.congregacion||'', hermano:c.hermano||'', num_discurso:c.numDiscurso?String(c.numDiscurso):'', telefono:c.telefono||'', mes:c.mes||null, anio:c.anio||null }) },
  arreglos: { tabla:'arreglos', toRow: a => ({ id:a.id, cong_id:_congId(), mes:a.mes||null, anio:a.anio||null, congregacion_nombre:a.congregacion||'', tipo:a.tipo||'entrada', estado:a.estado||'pendiente', obs:a.obs||'' }) },
};

/* ── dbUpsertItem ── */
async function dbUpsertItem(dKey, item){
  const m = _TBL[dKey]; if(!m) return;
  if(!item.id) item.id = uid();
  await dbUpsert(m.tabla, m.toRow(item));
}

/* ── dbDeleteItem ── */
async function dbDeleteItem(dKey, id){
  const m = _TBL[dKey]; if(!m) return;
  await dbDelete(m.tabla, id);
}

/* ── dbSaveDoc (miCongr o config) ── */
async function dbSaveDoc(field){
  if(field === 'miCongr') await dbSaveMiCongr();
  else if(field === 'config') await dbSaveConfig();
}

/* ── dbSaveArray (reemplazar coleccion completa) ── */
async function dbSaveArray(dKey){
  const m = _TBL[dKey]; if(!m) return;
  const arr = D[dKey] || [];
  // Borrar todos y reinsertar
  await _sb.from(m.tabla).delete().eq('cong_id', _congId());
  if(!arr.length) return;
  const rows = arr.map(m.toRow);
  for(let i=0; i<rows.length; i+=100){
    const { error } = await _sb.from(m.tabla).insert(rows.slice(i,i+100));
    if(error){ _handleError(error, 'Error en dbSaveArray ' + dKey); return; }
  }
}
