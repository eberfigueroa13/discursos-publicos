/* ============================================================
   supabase-init.js — Inicialización Supabase (UMD)
============================================================ */
var _sb = supabase.createClient(
  'https://drfqhkvppvteqwiycbjd.supabase.co',
  'sb_publishable_hEs_ro07hCvZXLFm_Gq88A_1kvfvqAE'
);

var _usr = null;
var _privilegiosDefault = ['Precursor Regular','Precursor Auxiliar','Precursor Especial','Pre-Grupo Romane'];
var _st = {};

var D = {
  miCongr:{nombre:'',direccion:'',dia:'6',horario:'',circuito:'',mapsSalon:'',
    coordNombre:'',coordTel:'',coordEmail:'',avNombre:'',avTel:'',avEmail:'',obs:''},
  config:{mes:new Date().getMonth()+1,anio:new Date().getFullYear(),
    congregacionExternaMes:'',diasBloqueo:365,discursosLocalesRequeridos:1,
    habraSalidasMes:'no',habraSCMes:'no',scNombre:'',scTel:'',scEmail:'',scObs:'',
    plantillaCarta:'',plantillaWhatsApp:''},
  discursos:[],locales:[],repertorioLocal:[],congregaciones:[],
  cargaMensual:[],planificacion:[],historial:[],salidasRealizadas:[],
  arreglos:[],privilegios:[]
};

/* ── Auth ── */
function loginErr(msg){
  var el=document.getElementById('login-err');
  if(el)el.textContent=msg||'';
}
function mostrarLogin(){
  var el=document.getElementById('login-overlay');
  if(el)el.classList.remove('hidden');
}
function ocultarLogin(){
  var el=document.getElementById('login-overlay');
  if(el)el.classList.add('hidden');
}

async function doLogin(){
  var email=document.getElementById('login-email')?.value?.trim();
  var pass=document.getElementById('login-pass')?.value;
  if(!email||!pass){loginErr('Ingresa tu email y contraseña');return;}
  var btn=document.getElementById('login-btn');
  if(btn){btn.disabled=true;btn.textContent='Ingresando...';}
  loginErr('');
  var res=await _sb.auth.signInWithPassword({email:email,password:pass});
  if(res.error){
    loginErr('Email o contraseña incorrectos');
    if(btn){btn.disabled=false;btn.textContent='Ingresar';}
    return;
  }
}

async function doLogout(){
  if(!confirm('Cerrar sesion?'))return;
  await _sb.auth.signOut();
  window.location.href='/index.html';
}

async function doResetPassword(){
  var email=document.getElementById('login-email')?.value?.trim();
  if(!email){loginErr('Ingresa tu email primero');return;}
  var res=await _sb.auth.resetPasswordForEmail(email,{
    redirectTo:'https://coordinadordiscursos.cl/index.html'
  });
  if(res.error){loginErr('Error: '+res.error.message);return;}
  alert('Se envio un email para restablecer tu contrasena.');
}

function actualizarChip(){
  var chip=document.getElementById('sb-user');
  if(!chip||!_usr)return;
  var roles={superadmin:'Super Admin',admin:'Administrador',coordinador:'Coordinador',lector:'Lector',visor:'Visor'};
  chip.innerHTML='<div style="width:32px;height:32px;border-radius:50%;background:var(--pr);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0">'+((_usr.nombre||'U')[0]).toUpperCase()+'</div>'
    +'<div class="user-info"><div class="user-name">'+esc(_usr.nombre||'')+'</div><div class="user-role">'+esc(roles[_usr.rol]||_usr.rol)+'</div></div>';
}

function aplicarRol(){
  if(!_usr)return;
  var esSA=_usr.rol==='superadmin';
  var esAdmin=_usr.rol==='admin'||esSA;
  var esCoord=_usr.rol==='coordinador'||esAdmin;
  var esLector=_usr.rol==='lector'||esCoord;
  document.querySelectorAll('[data-roles]').forEach(function(el){
    var roles=el.dataset.roles.split(',');
    var visible=roles.some(function(r){
      if(r==='superadmin')return esSA;
      if(r==='admin')return esAdmin;
      if(r==='coordinador')return esCoord;
      if(r==='lector')return esLector;
      return true;
    });
    el.style.display=visible?'':'none';
  });
}

/* ── DB Layer ── */
function _congId(){return (_usr&&_usr.cong_id)||'';}

function syncBar(show,msg){
  var el=document.getElementById('sync-indicator');
  if(!el)return;
  el.classList.toggle('show',!!show);
  var lbl=el.querySelector('.sync-label');
  if(lbl)lbl.textContent=msg||'Sincronizando...';
}

async function dbLoadAll(cb){
  if(!_congId()){if(cb)cb();return;}
  syncBar(true,'Cargando datos...');
  try{
    var cid=_congId();
    var results=await Promise.all([
      _sb.from('congregaciones').select('*').eq('id',cid).single(),
      _sb.from('config').select('*').eq('cong_id',cid).single(),
      _sb.from('discursos').select('*').eq('cong_id',cid),
      _sb.from('hermanos').select('*').eq('cong_id',cid),
      _sb.from('repertorio').select('*').eq('cong_id',cid),
      _sb.from('congregaciones_ext').select('*').eq('cong_id',cid),
      _sb.from('privilegios').select('*').eq('cong_id',cid),
      _sb.from('planificacion').select('*').eq('cong_id',cid),
      _sb.from('historial').select('*').eq('cong_id',cid),
      _sb.from('salidas').select('*').eq('cong_id',cid),
      _sb.from('carga_mensual').select('*').eq('cong_id',cid),
      _sb.from('arreglos').select('*').eq('cong_id',cid),
    ]);
    var mc=results[0].data, cfg=results[1].data;
    if(mc)D.miCongr={nombre:mc.nombre||'',direccion:mc.direccion||'',dia:mc.dia||'6',horario:mc.horario||'',circuito:mc.circuito||'',mapsSalon:mc.maps_salon||'',coordNombre:mc.coord_nombre||'',coordTel:mc.coord_tel||'',coordEmail:mc.coord_email||'',avNombre:mc.av_nombre||'',avTel:mc.av_tel||'',avEmail:mc.av_email||'',obs:mc.obs||''};
    if(cfg)D.config={mes:cfg.mes||new Date().getMonth()+1,anio:cfg.anio||new Date().getFullYear(),congregacionExternaMes:cfg.congregacion_externa_mes||'',diasBloqueo:cfg.dias_bloqueo||365,discursosLocalesRequeridos:cfg.discursos_locales_requeridos||1,habraSalidasMes:cfg.habra_salidas_mes||'no',habraSCMes:cfg.habra_sc_mes||'no',scNombre:cfg.sc_nombre||'',scTel:cfg.sc_tel||'',scEmail:cfg.sc_email||'',scObs:cfg.sc_obs||'',plantillaCarta:cfg.plantilla_carta||'',plantillaWhatsApp:cfg.plantilla_whatsapp||''};
    D.discursos=(results[2].data||[]).map(function(d){return{id:d.id,numero:d.numero,titulo:d.titulo,estado:d.estado,obs:d.obs||''};});
    D.locales=(results[3].data||[]).map(function(h){return{id:h.id,nombre:h.nombre,nombramiento:h.nombramiento||'',telefono:h.telefono||'',puedeAfuera:h.puede_afuera||'si',puedeLocal:h.puede_local||'si',estado:h.estado||'Activo',obs:h.obs||'',privilegios:typeof h.privilegios==='string'?JSON.parse(h.privilegios||'[]'):(h.privilegios||[])};});
    D.repertorioLocal=(results[4].data||[]).map(function(r){return{id:r.id,hermanoId:r.hermano_id||'',numDiscurso:r.num_discurso,titulo:r.titulo||'',puedeAfuera:r.puede_afuera||'si',puedeLocal:r.puede_local||'si',estado:r.estado||'Activo',obs:r.obs||''};});
    D.congregaciones=(results[5].data||[]).map(function(c){return{id:c.id,nombre:c.nombre,direccion:c.direccion||'',dia:c.dia||'0',horario:c.horario||'',coordNombre:c.coord_nombre||'',coordTel:c.coord_tel||'',coordEmail:c.coord_email||'',obs:c.obs||''};});
    D.privilegios=(results[6].data||[]).map(function(p){return{id:p.id,nombre:p.nombre};});
    D.planificacion=(results[7].data||[]).map(function(p){return{id:p.id,tipo:p.tipo||'',_origen:p.origen||'',_hermanoId:p.hermano_id||'',fecha:p.fecha||'',congregacion:p.congregacion||'',hermano:p.hermano||'',numDiscurso:p.num_discurso||'',titulo:p.titulo||'',confirmado:p.confirmado||'Por confirmar',obs:p.obs||''};});
    D.historial=(results[8].data||[]).map(function(h){return{id:h.id,fecha:h.fecha||'',tipo:h.tipo||'',congregacion:h.congregacion||'',hermano:h.hermano||'',hermanoId:h.hermano_id||'',telefono:h.telefono||'',numDiscurso:h.num_discurso||'',titulo:h.titulo||'',obs:h.obs||''};});
    D.salidasRealizadas=(results[9].data||[]).map(function(s){return{id:s.id,fecha:s.fecha||'',congregacion:s.congregacion||'',hermano:s.hermano||'',hermanoId:s.hermano_id||'',numDiscurso:s.num_discurso||'',titulo:s.titulo||'',obs:s.obs||''};});
    D.cargaMensual=(results[10].data||[]).map(function(c){return{id:c.id,congregacion:c.congregacion||'',hermano:c.hermano||'',numDiscurso:c.num_discurso||'',telefono:c.telefono||'',mes:c.mes,anio:c.anio};});
    D.arreglos=(results[11].data||[]).map(function(a){return{id:a.id,mes:a.mes,anio:a.anio,congregacion:a.congregacion_nombre||'',tipo:a.tipo||'entrada',estado:a.estado||'pendiente',obs:a.obs||''};});
    if(!D.privilegios.length)D.privilegios=_privilegiosDefault.map(function(n){return{id:uid(),nombre:n};});
    syncBar(false);
    if(cb)cb();
  }catch(e){
    console.error('dbLoadAll error:',e);
    syncBar(false);
    if(cb)cb();
  }
}

async function dbUpsertItem(dKey,item){
  var tbl={discursos:'discursos',locales:'hermanos',repertorioLocal:'repertorio',congregaciones:'congregaciones_ext',privilegios:'privilegios',planificacion:'planificacion',historial:'historial',salidasRealizadas:'salidas',cargaMensual:'carga_mensual',arreglos:'arreglos'};
  var t=tbl[dKey];if(!t)return;
  if(!item.id)item.id=uid();
  var row=_toRow(dKey,item);
  var res=await _sb.from(t).upsert(row,{onConflict:'id'});
  if(res.error)console.error('dbUpsertItem error',dKey,res.error.message);
}

async function dbDeleteItem(dKey,id){
  var tbl={discursos:'discursos',locales:'hermanos',repertorioLocal:'repertorio',congregaciones:'congregaciones_ext',privilegios:'privilegios',planificacion:'planificacion',historial:'historial',salidasRealizadas:'salidas',cargaMensual:'carga_mensual',arreglos:'arreglos'};
  var t=tbl[dKey];if(!t)return;
  var res=await _sb.from(t).delete().eq('id',id).eq('cong_id',_congId());
  if(res.error)console.error('dbDeleteItem error',dKey,res.error.message);
}

async function dbSaveDoc(field){
  if(field==='miCongr'){
    var mc=D.miCongr;
    await _sb.from('congregaciones').update({direccion:mc.direccion||'',dia:mc.dia||'6',horario:mc.horario||'',maps_salon:mc.mapsSalon||'',coord_nombre:mc.coordNombre||'',coord_tel:mc.coordTel||'',coord_email:mc.coordEmail||'',av_nombre:mc.avNombre||'',av_tel:mc.avTel||'',av_email:mc.avEmail||'',obs:mc.obs||''}).eq('id',_congId());
  }else if(field==='config'){
    var c=D.config;
    await _sb.from('config').upsert({cong_id:_congId(),mes:c.mes,anio:c.anio,congregacion_externa_mes:c.congregacionExternaMes||'',dias_bloqueo:c.diasBloqueo||365,discursos_locales_requeridos:c.discursosLocalesRequeridos||1,habra_salidas_mes:c.habraSalidasMes||'no',habra_sc_mes:c.habraSCMes||'no',sc_nombre:c.scNombre||'',sc_tel:c.scTel||'',sc_email:c.scEmail||'',sc_obs:c.scObs||'',plantilla_carta:c.plantillaCarta||'',plantilla_whatsapp:c.plantillaWhatsApp||''},{onConflict:'cong_id'});
  }
}

async function dbSaveArray(dKey){
  var tbl={discursos:'discursos',locales:'hermanos',repertorioLocal:'repertorio',congregaciones:'congregaciones_ext',privilegios:'privilegios',planificacion:'planificacion',historial:'historial',salidasRealizadas:'salidas',cargaMensual:'carga_mensual',arreglos:'arreglos'};
  var t=tbl[dKey];if(!t)return;
  var arr=D[dKey]||[];
  await _sb.from(t).delete().eq('cong_id',_congId());
  if(!arr.length)return;
  var rows=arr.map(function(item){return _toRow(dKey,item);});
  for(var i=0;i<rows.length;i+=100){
    var res=await _sb.from(t).insert(rows.slice(i,i+100));
    if(res.error){console.error('dbSaveArray error',dKey,res.error.message);return;}
  }
}

function _toRow(dKey,item){
  var cid=_congId();
  if(dKey==='discursos')return{id:item.id,cong_id:cid,numero:item.numero,titulo:item.titulo,estado:item.estado||'Activo',obs:item.obs||''};
  if(dKey==='locales')return{id:item.id,cong_id:cid,nombre:item.nombre,nombramiento:item.nombramiento||'',telefono:item.telefono||'',puede_afuera:item.puedeAfuera||'si',puede_local:item.puedeLocal||'si',estado:item.estado||'Activo',obs:item.obs||'',privilegios:JSON.stringify(item.privilegios||[])};
  if(dKey==='repertorioLocal')return{id:item.id,cong_id:cid,hermano_id:item.hermanoId||null,num_discurso:item.numDiscurso||null,titulo:item.titulo||'',puede_afuera:item.puedeAfuera||'si',puede_local:item.puedeLocal||'si',estado:item.estado||'Activo',obs:item.obs||''};
  if(dKey==='congregaciones')return{id:item.id,cong_id:cid,nombre:item.nombre,direccion:item.direccion||'',dia:item.dia||'0',horario:item.horario||'',coord_nombre:item.coordNombre||'',coord_tel:item.coordTel||'',coord_email:item.coordEmail||'',obs:item.obs||''};
  if(dKey==='privilegios')return{id:item.id,cong_id:cid,nombre:item.nombre};
  if(dKey==='planificacion')return{id:item.id,cong_id:cid,tipo:item.tipo||'',origen:item._origen||'',hermano_id:item._hermanoId||null,fecha:item.fecha||'',congregacion:item.congregacion||'',hermano:item.hermano||'',num_discurso:item.numDiscurso?String(item.numDiscurso):'',titulo:item.titulo||'',confirmado:item.confirmado||'Por confirmar',obs:item.obs||''};
  if(dKey==='historial')return{id:item.id,cong_id:cid,fecha:item.fecha||'',tipo:item.tipo||'',congregacion:item.congregacion||'',hermano:item.hermano||'',hermano_id:item.hermanoId||null,telefono:item.telefono||'',num_discurso:item.numDiscurso?String(item.numDiscurso):'',titulo:item.titulo||'',obs:item.obs||''};
  if(dKey==='salidasRealizadas')return{id:item.id,cong_id:cid,fecha:item.fecha||'',congregacion:item.congregacion||'',hermano:item.hermano||'',hermano_id:item.hermanoId||null,num_discurso:item.numDiscurso?String(item.numDiscurso):'',titulo:item.titulo||'',obs:item.obs||''};
  if(dKey==='cargaMensual')return{id:item.id,cong_id:cid,congregacion:item.congregacion||'',hermano:item.hermano||'',num_discurso:item.numDiscurso?String(item.numDiscurso):'',telefono:item.telefono||'',mes:item.mes||null,anio:item.anio||null};
  if(dKey==='arreglos')return{id:item.id,cong_id:cid,mes:item.mes||null,anio:item.anio||null,congregacion_nombre:item.congregacion||'',tipo:item.tipo||'entrada',estado:item.estado||'pendiente',obs:item.obs||''};
  return item;
}

/* ── Auth state listener ── */
_sb.auth.onAuthStateChange(function(event,session){
  if(!session){mostrarLogin();return;}
  _sb.from('usuarios').select('*').eq('email',session.user.email).single().then(function(res){
    if(res.error||!res.data||!res.data.activo){
      mostrarLogin();
      loginErr('No tienes acceso. Contacta al administrador.');
      _sb.auth.signOut();
      return;
    }
    _usr={id:session.user.id,email:session.user.email,nombre:res.data.nombre||'',rol:res.data.rol||'visor',cong_id:res.data.cong_id||''};
    ocultarLogin();
    actualizarChip();
    aplicarRol();
    if(_usr.cong_id){
      dbLoadAll(function(){
        if(typeof initPagina==='function')initPagina();
      });
    }else{
      if(typeof initPagina==='function')initPagina();
    }
  });
});
