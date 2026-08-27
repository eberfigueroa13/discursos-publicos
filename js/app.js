/* ============================================================
   app.js — Coordinador de Discursos Públicos v4
   Supabase + toda la lógica de la aplicación
============================================================ */

/* ── Supabase Init ── */
var _sb = supabase.createClient(
  'https://drfqhkvppvteqwiycbjd.supabase.co',
  'sb_publishable_hEs_ro07hCvZXLFm_Gq88A_1kvfvqAE'
);

var _usr = null;
var _privilegiosDefault = ['Precursor Regular','Precursor Auxiliar','Precursor Especial','Pre-Grupo Romane'];
var _st = {};
var _sel = {d:[],h:[],r:[],ce:[],ar:[],cm:[],hi:[],sx:[],pe:[],ps:[],priv:[]};

/* ── Modelo de datos ── */
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


/* ── Variables globales ── */
var _DS={d:'discursos',h:'locales',r:'repertorioLocal',ce:'congregaciones',ar:'arreglos',cm:'cargaMensual',hi:'historial',sx:'salidasRealizadas',pe:'planificacion',ps:'planificacion'};
var _COL={
  discursos:'discursos',
  locales:'hermanos',
  repertorioLocal:'repertorio',
  congregaciones:'congregaciones_ext',
  cargaMensual:'carga_mensual',
  planificacion:'planificacion',
  historial:'historial',
  salidasRealizadas:'salidas',
  privilegios:'privilegios',
  arreglos:'arreglos'
};
var _invPendiente=null;
/* Firebase removido — usando Supabase */

/* ── Funciones de la aplicación ── */

function uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}

function diasDesde(f,ref){
  if(!f)return Infinity;
  var base=ref?new Date(ref):new Date();
  if(isNaN(base.getTime()))base=new Date();
  var desde=new Date(f+'T00:00:00');
  if(isNaN(desde.getTime()))return Infinity;
  return Math.floor((base-desde)/86400000);
}

function refMes(){
  var c=D.config;
  var m=String(c.mes).padStart(2,'0');
  return c.anio+'-'+m+'-01T00:00:00';
}

function nMes(n){return['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][n]||'';}

function nomDia(d){return['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'][parseInt(d)]||'';}

function esc(v){return(v||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function sep(txt){return txt.split(/\t|;|,(?!\d)/).map(function(s){return s.trim();});}

function fmtF(f){if(!f)return '';var p=f.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:f;}

function normFecha(f){f=(f||'').trim();if(!f)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(f))return f;var m=f.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return f;}

function toast(msg,tipo){
  var tc=document.getElementById('tc')||document.body;
  if(!tc)return;
  var t=document.createElement('div');t.className='toast t'+(tipo||'i')[0];t.textContent=msg;
  tc.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},3500);
}

function openM(tit,html,bots){
  document.getElementById('mt').textContent=tit;
  document.getElementById('mb').innerHTML=html;
  var ma=document.getElementById('ma');ma.innerHTML='';
  (bots||[]).forEach(function(b){var el=document.createElement('button');el.className='btn '+b.c;el.textContent=b.l;el.onclick=b.fn;ma.appendChild(el);});
  var overlay=document.getElementById('modal-overlay');
  var modal=document.getElementById('modal');
  if(overlay)overlay.style.display='flex';
  if(modal)modal.classList.add('open');
}

function closeM(){
  var overlay=document.getElementById('modal-overlay');
  var modal=document.getElementById('modal');
  if(overlay)overlay.style.display='none';
  if(modal)modal.classList.remove('open');
}

function confirmar(msg,cb){openM('Confirmar','<p style="font-size:14px">'+msg+'</p>',[{l:'Cancelar',c:'bg',fn:closeM},{l:'Confirmar',c:'bd2',fn:function(){closeM();cb();}}]);}

function toggleArea(id){var a=document.getElementById(id);if(a)a.style.display=a.style.display==='none'?'block':'none';}

function fechasMes(mes,anio,diaSem){
  /* devuelve array de strings YYYY-MM-DD para cada ocurrencia de diaSem en ese mes */
  var ds=parseInt(diaSem),res=[],d=new Date(anio,mes-1,1);
  while(d.getMonth()===mes-1){
    if(d.getDay()===ds){
      var dd=d.getDate().toString().padStart(2,'0');
      var mm=mes.toString().padStart(2,'0');
      res.push(anio+'-'+mm+'-'+dd);
    }
    d.setDate(d.getDate()+1);
  }
  return res;
}

function topMeta(){
  var mc=D.miCongr,c=D.config;
  var el=document.getElementById('tbm');
  if(el)el.textContent=mc.nombre?(mc.nombre+' • '+nMes(c.mes)+' '+c.anio+' • '+nomDia(mc.dia)):'';
}

function chkBox(t,id){
  return '<input type="checkbox" data-t="'+t+'" data-id="'+id+'" onchange="onChk(this)">';
}

function onChk(el){
  var t=el.dataset.t,id=el.dataset.id;
  if(el.checked){if(_sel[t].indexOf(id)<0)_sel[t].push(id);}
  else{_sel[t]=_sel[t].filter(function(x){return x!==id;});}
  var row=el.closest('tr');if(row)row.classList.toggle('sel-row',el.checked);
  updBBar(t);
}

function selAll(t,el){
  var tbs={d:'tb-d',h:'tb-h',r:'tb-r',ce:'tb-ce',ar:'tb-ar',cm:'tb-cm',hi:'tb-hi',sx:'tb-sx',pe:'tb-pe',ps:'tb-ps'};
  var tb=document.getElementById(tbs[t]);if(!tb)return;
  var chks=tb.querySelectorAll('input[type=checkbox]');
  _sel[t]=[];
  chks.forEach(function(c){c.checked=el.checked;var row=c.closest('tr');if(row)row.classList.toggle('sel-row',el.checked);if(el.checked)_sel[t].push(c.dataset.id);});
  updBBar(t);
}

function updBBar(t){
  var bar=document.getElementById('bbar-'+t);if(!bar)return;
  var cnt=_sel[t].length;
  bar.classList.toggle('show',cnt>0);
  var c=document.getElementById('bcnt-'+t);if(c)c.textContent=cnt+' seleccionado'+(cnt!==1?'s':'');
}

function bulkClear(t){
  _sel[t]=[];
  var tbs={d:'tb-d',h:'tb-h',r:'tb-r',ce:'tb-ce',ar:'tb-ar',cm:'tb-cm',hi:'tb-hi',sx:'tb-sx',pe:'tb-pe',ps:'tb-ps'};
  var tb=document.getElementById(tbs[t]);if(tb)tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=false;var row=c.closest('tr');if(row)row.classList.remove('sel-row');});
  var bar=document.getElementById('bbar-'+t);if(bar)bar.classList.remove('show');
  // desmarcar header checkbox
  var hchk=document.querySelector('#s-'+{d:'discursos',h:'hermanos',r:'repertorio',ce:'congregaciones',ar:'arreglos',cm:'carga',hi:'historial',sx:'salidas',pe:'planif',ps:'planif'}[t]+' thead input[type=checkbox]');
  if(hchk)hchk.checked=false;
}

function bulkDel(t){
  var ids=_sel[t].slice();if(!ids.length)return;
  confirmar('Eliminar '+ids.length+' registro(s) seleccionado(s)?',function(){
    var RNDs={d:function(){D.discursos=D.discursos.filter(function(x){return ids.indexOf(x.id)<0;});renderD();},
      h:function(){D.locales=D.locales.filter(function(x){return ids.indexOf(x.id)<0;});D.repertorioLocal=D.repertorioLocal.filter(function(r){return ids.indexOf(r.hermanoId)<0;});renderH();fillSelH();},
      r:function(){D.repertorioLocal=D.repertorioLocal.filter(function(x){return ids.indexOf(x.id)<0;});renderRep();},
      ce:function(){D.congregaciones=D.congregaciones.filter(function(x){return ids.indexOf(x.id)<0;});renderCE();poblarSelCE();poblarSelCMCong();},
      ar:function(){D.arreglos=D.arreglos.filter(function(x){return ids.indexOf(x.id)<0;});renderArreglos();aplicarArregloAConfig();},
      cm:function(){D.cargaMensual=D.cargaMensual.filter(function(x){return ids.indexOf(x.id)<0;});renderCM();},
      hi:function(){D.historial=D.historial.filter(function(x){return ids.indexOf(x.id)<0;});renderHist();poblarFiltAnio();},
      sx:function(){D.salidasRealizadas=D.salidasRealizadas.filter(function(x){return ids.indexOf(x.id)<0;});renderSalidas();poblarFiltAnioSal();},
      pe:function(){D.planificacion=D.planificacion.filter(function(x){return ids.indexOf(x.id)<0;});renderPlan();},
      ps:function(){D.planificacion=D.planificacion.filter(function(x){return ids.indexOf(x.id)<0;});renderPlan();}
    };
    if(RNDs[t])RNDs[t]();
    var dkeyDel={d:'discursos',h:'locales',r:'repertorioLocal',ce:'congregaciones',
      ar:'arreglos',cm:'cargaMensual',hi:'historial',sx:'salidasRealizadas',
      pe:'planificacion',ps:'planificacion'};
    ids.forEach(function(id){ dbDeleteItem(dkeyDel[t],id); });
    _sel[t]=[];updBBar(t);toast('Eliminados','s');
  });
}

function bulkSet(t,campo,selId){
  var ids=_sel[t].slice();var val=document.getElementById(selId).value;
  if(!ids.length||!val){toast('Selecciona registros y un valor','w');return;}
  var dkey={d:'discursos',h:'locales',r:'repertorioLocal',ce:'congregaciones',
    ar:'arreglos',cm:'cargaMensual',hi:'historial',sx:'salidasRealizadas',
    pe:'planificacion',ps:'planificacion'};
  var src=(t==='pe'||t==='ps')?D.planificacion:D[_DS[t]];
  var modified=[];
  ids.forEach(function(id){
    var obj=src.find(function(x){return x.id===id;});
    if(obj){obj[campo]=val;modified.push(obj);}
  });
  if(t==='d'&&campo==='estado')sincronizarDiscursosInactivos(true);
  // Guardar cada item modificado individualmente
  if(dkey[t]){
    modified.forEach(function(obj){ dbUpsertItem(dkey[t],obj); });
  }
  var rfn={d:function(){renderD();renderRep();renderCM();renderPlan();},h:renderH,r:renderRep,ce:renderCE,ar:renderArreglos,cm:renderCM,hi:renderHist,sx:renderSalidas,pe:renderPlan,ps:renderPlan};
  if(rfn[t])rfn[t]();
  _sel[t]=[];updBBar(t);toast('Actualizado '+ids.length+' registro(s)','s');
}

function sortT(th){
  var t=th.dataset.t,c=th.dataset.c,k=t+'.'+c;
  _st[k]=_st[k]==='asc'?'desc':'asc';
  var tbl=th.closest('table');
  if(tbl)tbl.querySelectorAll('th.sort').forEach(function(el){
    var ek=el.dataset.t+'.'+el.dataset.c;
    // Limpiar texto dejando solo el label original sin flechas
    var txt=el.textContent.replace(/[▲▼⇅\s]+$/,'').trim();
    var arrow=_st[ek]==='asc'?' ▲':_st[ek]==='desc'?' ▼':' ⇅';
    el.textContent=txt+arrow;
  });
  var fn={d:renderD,h:renderH,r:renderRep,ce:renderCE,ar:renderArreglos,cm:renderCM,hi:renderHist,sx:renderSalidas};
  if(fn[t])fn[t]();
}

function getSC(t){
  var ks=Object.keys(_st).filter(function(k){return k.startsWith(t+'.');});
  return ks.length?ks[ks.length-1].split('.')[1]:null;
}

function ordenar(lista,t,defC,defD){
  var c=getSC(t)||defC;if(!c)return lista;
  var k=t+'.'+c,dir=_st[k]==='asc'?1:_st[k]==='desc'?-1:(defD||1);
  return lista.slice().sort(function(a,b){
    var va=a[c]!==undefined?a[c]:'',vb=b[c]!==undefined?b[c]:'';
    if(va===Infinity)return -1*dir;if(vb===Infinity)return 1*dir;
    if(typeof va==='number'&&typeof vb==='number')return(va-vb)*dir;
    return va.toString().localeCompare(vb.toString())*dir;
  });
}

function btnAc(cls,label,fn,id){return '<button class="btn '+cls+' bsm" data-fn="'+fn+'" data-id="'+esc(id)+'" onclick="dsp(this)">'+label+'</button>';}

function dsp(el){
  var fn=el.dataset.fn,id=el.dataset.id;
  if(fn==='delPriv'){delPriv(id);return;}
  var M={editD:editD,delD:delD,editH:editH,delH:delH,delRep:delRep,editCE:editCE,delCE:delCE,editArreglo:editArreglo,delArreglo:delArreglo,delCM:delCM,delHist:delHist,delSalidaHist:delSalidaHist};
  if(M[fn])M[fn](id);
}

function renderDash(){
  topMeta();
  var c=D.config, mc=D.miCongr;
  var hoy=new Date().toISOString().slice(0,10);
  var ym=c.anio+'-'+String(c.mes).padStart(2,'0');
  var isRoot=window.location.pathname.indexOf('/pages/')===-1;
  var pre=isRoot?'pages/':'';

  function nav(href){ window.location = href; }

  var planMes=D.planificacion.filter(function(p){return p.fecha&&p.fecha.slice(0,7)===ym;});
  var extMes=planMes.filter(function(p){return p.tipo==='Externo';});
  var sinAsignar=extMes.filter(function(p){return !p.hermano||!p.numDiscurso;}).length;
  var confirmados=extMes.filter(function(p){return p.confirmado==='Si';}).length;
  var proximas=extMes.filter(function(p){return p.fecha>=hoy;}).sort(function(a,b){return a.fecha.localeCompare(b.fecha);}).slice(0,4);

  var hermActivos=D.locales.filter(function(h){return h.estado==='Activo'&&h.puedeAfuera==='si';});
  var hermSinSalir=hermActivos.map(function(h){
    var ult=ultimaSalidaHermano(h.id);
    var dias=ult?diasDesde(ult,refMes()):9999;
    return {nombre:h.nombre,nombramiento:h.nombramiento||'',dias:dias,ultima:ult};
  }).sort(function(a,b){return b.dias-a.dias;}).slice(0,6);

  var discActivos=D.discursos.filter(function(d){return d.estado==='Activo';});
  var discSinDar=discActivos.map(function(d){
    var ult=ultimaVez(d.numero);
    return {numero:d.numero,titulo:d.titulo,dias:ult?diasDesde(ult,refMes()):9999,ultima:ult};
  }).sort(function(a,b){return b.dias-a.dias;}).slice(0,5);

  var arrPend=(D.arreglos||[]).filter(function(a){return a.estado!=='Confirmado'&&a.estado!=='Cancelado';});

  var statsEl=document.getElementById('dstats');
  if(statsEl){
    var stats=[
      {l:'Mes coordinado',v:nMes(c.mes)+' '+c.anio,s:'',w:false,href:pre+'configuracion.html'},
      {l:'Fechas del mes',v:extMes.length,s:confirmados+' confirm. / '+sinAsignar+' sin asignar',w:sinAsignar>0,href:pre+'planificacion.html'},
      {l:'Hermanos activos',v:D.locales.filter(function(h){return h.estado==='Activo';}).length,s:'',w:false,href:pre+'hermanos.html'},
      {l:'Discursos activos',v:discActivos.length,s:'',w:false,href:pre+'discursos.html'},
      {l:'Arreglos pendientes',v:arrPend.length,s:'',w:arrPend.length>0,href:pre+'arreglos.html'},
    ];
    var html='';
    for(var si=0;si<stats.length;si++){
      var st=stats[si];
      var fs=typeof st.v==='string'&&st.v.length>8?'15px':'28px';
      var col=st.w?'color:var(--ye)':'';
      html+='<div class="sc" data-href="'+st.href+'" style="cursor:pointer">'
        +'<div class="sl">'+st.l+'</div>'
        +'<div class="sv" style="font-size:'+fs+';'+col+'">'+esc(String(st.v))+'</div>'
        +(st.s?'<div class="ss">'+st.s+'</div>':'')
        +'</div>';
    }
    statsEl.innerHTML=html;
    statsEl.querySelectorAll('[data-href]').forEach(function(el){
      el.addEventListener('click',function(){window.location=el.dataset.href;});
    });
  }

  var diEl=document.getElementById('di');
  if(diEl){
    // Proximas fechas
    var htmlProx='<div class="card" data-href="'+pre+'planificacion.html" style="margin:0;cursor:pointer">'
      +'<div class="ctit" style="margin-bottom:10px">&#128197; Proximas fechas</div>';
    if(proximas.length){
      for(var pi=0;pi<proximas.length;pi++){
        var p=proximas[pi];
        var ok=p.confirmado==='Si',pend=!p.hermano||!p.numDiscurso;
        htmlProx+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px">'
          +'<div style="font-size:12px;font-weight:600;color:var(--pr);width:60px">'+fmtF(p.fecha)+'</div>'
          +'<div style="flex:1"><div style="font-weight:500">'+(p.hermano?esc(p.hermano):'<span style="color:var(--rd)">Sin asignar</span>')+'</div>'
          +(p.numDiscurso?'<div style="font-size:11px;color:var(--tx3)">N° '+p.numDiscurso+'</div>':'')
          +'</div>'
          +'<span style="font-size:11px;padding:2px 6px;border-radius:10px;background:'+(ok?'var(--gnl)':pend?'var(--rdl)':'var(--yel)')+';color:'+(ok?'var(--gn)':pend?'var(--rd)':'var(--ye)')+';">'+(ok?'OK':pend?'Pend.':'Por conf.')+'</span>'
          +'</div>';
      }
    } else { htmlProx+='<div style="text-align:center;padding:20px;color:var(--tx3)">Sin fechas proximas</div>'; }
    htmlProx+='</div>';

    // Sugerencias de salida
    var htmlSal='<div class="card" data-href="'+pre+'planificacion.html" style="margin:0;cursor:pointer">'
      +'<div class="ctit" style="margin-bottom:10px">&#128652; Sugerencias de salida</div>';
    if(hermSinSalir.length){
      for(var hi=0;hi<hermSinSalir.length;hi++){
        var h=hermSinSalir[hi];
        htmlSal+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px">'
          +'<div style="flex:1"><div style="font-weight:500">'+esc(h.nombre)+'</div>'
          +'<div style="font-size:11px;color:var(--tx3)">'+esc(h.nombramiento)+'</div></div>'
          +'<div style="font-size:11px;color:var(--tx3)">'+(h.ultima?'Hace '+h.dias+' dias':'Nunca ha salido')+'</div>'
          +'</div>';
      }
    } else { htmlSal+='<div style="text-align:center;padding:20px;color:var(--tx3)">Todos al dia</div>'; }
    htmlSal+='</div>';

    // Discursos sin dar
    var htmlDisc='<div class="card" data-href="'+pre+'historial.html" style="margin:0 0 16px;cursor:pointer">'
      +'<div class="ctit" style="margin-bottom:10px">&#128218; Discursos sin dar hace mas tiempo</div>'
      +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
      +'<thead><tr style="font-size:12px;color:var(--tx3);border-bottom:2px solid var(--bd)">'
      +'<th style="padding:8px;text-align:left">N°</th><th style="padding:8px;text-align:left">Titulo</th>'
      +'<th style="padding:8px;text-align:left">Ultima vez</th></tr></thead><tbody>';
    for(var di=0;di<discSinDar.length;di++){
      var d=discSinDar[di];
      htmlDisc+='<tr style="border-bottom:1px solid var(--bd);font-size:13px">'
        +'<td style="padding:8px;font-weight:600">'+d.numero+'</td>'
        +'<td style="padding:8px">'+esc(d.titulo)+'</td>'
        +'<td style="padding:8px;color:var(--tx3)">'+(d.ultima?fmtF(d.ultima)+' ('+d.dias+' dias)':'Nunca dado')+'</td>'
        +'</tr>';
    }
    htmlDisc+='</tbody></table></div></div>';

    // Mi congregacion
    var htmlCong='<div class="card" data-href="'+pre+'configuracion.html" style="margin:0;cursor:pointer">'
      +'<div class="ctit" style="margin-bottom:10px">&#127968; Mi congregacion</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:var(--tx2)">'
      +(mc.nombre?'<span><strong>'+esc(mc.nombre)+'</strong></span>':'<span style="color:var(--tx3)">No configurada</span>')
      +(mc.direccion?'<span>'+esc(mc.direccion)+'</span>':'')
      +(mc.dia?'<span>'+nomDia(mc.dia)+' '+esc(mc.horario)+'</span>':'')
      +(mc.circuito?'<span>Circuito: '+esc(mc.circuito)+'</span>':'')
      +(mc.coordNombre?'<span>Coord: '+esc(mc.coordNombre)+' '+esc(mc.coordTel)+'</span>':'')
      +'</div></div>';

    diEl.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'+htmlProx+htmlSal+'</div>'+htmlDisc+htmlCong;

    diEl.querySelectorAll('[data-href]').forEach(function(el){
      el.addEventListener('click',function(){window.location=el.dataset.href;});
    });
  }
}

function loadMC(){
  var mc=D.miCongr;
  var m={n:'nombre',d:'direccion',h:'horario',cir:'circuito',maps:'mapsSalon',
    cn:'coordNombre',ct:'coordTel',ce:'coordEmail',
    avn:'avNombre',avt:'avTel',ave:'avEmail',o:'obs'};
  Object.keys(m).forEach(function(k){var el=document.getElementById('mc-'+k);if(el)el.value=mc[m[k]]||'';});
  var sd=document.getElementById('mc-dia');if(sd)sd.value=mc.dia||'6';
}

function guardarMC(){
  var m={n:'nombre',d:'direccion',h:'horario',cir:'circuito',maps:'mapsSalon',
    cn:'coordNombre',ct:'coordTel',ce:'coordEmail',
    avn:'avNombre',avt:'avTel',ave:'avEmail',o:'obs'};
  Object.keys(m).forEach(function(k){var el=document.getElementById('mc-'+k);if(el)D.miCongr[m[k]]=el.value.trim();});
  D.miCongr.dia=document.getElementById('mc-dia').value;
  dbSaveDoc('miCongr');toast('Datos guardados','s');topMeta();
}

function poblarSelCE(){
  var sel=document.getElementById('cfg-ce');if(!sel)return;var v=D.config.congregacionExternaMes;
  sel.innerHTML='<option value="">-- Seleccionar --</option>'+D.congregaciones.map(function(c){return '<option value="'+esc(c.nombre)+'" '+(v===c.nombre?'selected':'')+'>'+esc(c.nombre)+'</option>';}).join('');
}

function plantillaDefault(){
  return 'ARREGLO DE CONFERENCIAS CON {{congregacionDestino}}\n\nA: {{coordDestNombre}}\n\nEstimado hermano {{coordDestNombre}}:\n\nJunto con saludarle y esperando que se encuentre bien, es un agrado para nosotros contar con la oportunidad de realizar el arreglo de conferencias con su congregacion para el mes de {{mes}}. En armonia con lo anterior, compartimos los datos necesarios para contactarnos ante cualquier consulta o inquietud:\n\n- Congregacion {{miCongr}} - Circuito {{circuito}}\n- Direccion del Salon del Reino: {{direccion}}\n- Horario de reunion: {{dia}} {{horario}}\n- Coordinador de discursos publicos: {{coordNombre}}, {{coordTel}}, {{coordEmail}}\n- Contacto de Audio y Video: {{avNombre}}, {{avTel}}, {{avEmail}}\n- Google Maps del Salon: {{mapsSalon}}\n\nTodas las semanas tenemos el arreglo de hospitalidad con los hermanos que nos visitan. Por esta razon, les pedimos que indiquen a los hermanos que nos visitaran si podran quedarse a la hospitalidad, a mas tardar el miercoles de cada semana, para que los hermanos de cada grupo puedan hacer los arreglos correspondientes.\n\nEn la siguiente pagina (Anexo 1) encontrara el detalle de los conferenciantes y los bosquejos de discursos publicos disponibles para exponerlos en su congregacion.\n\nSe despide afectuosamente,';
}

function resetPlantillaCarta(){
  D.config.plantillaCarta=plantillaDefault();
  dbSaveDoc('config');
  var el=document.getElementById('cfg-carta');if(el)el.value=D.config.plantillaCarta;
  toast('Plantilla restaurada','s');
}

function loadConfig(){
  var c=D.config;
  var ids={m:'mes',a:'anio',d:'diasBloqueo',lr:'discursosLocalesRequeridos'};
  Object.keys(ids).forEach(function(k){var el=document.getElementById('cfg-'+k);if(el)el.value=c[ids[k]]||'';});
  var sc={n:'scNombre',t:'scTel',e:'scEmail',o:'scObs'};
  Object.keys(sc).forEach(function(k){var el=document.getElementById('cfg-sc-'+k);if(el)el.value=c[sc[k]]||'';});
  var carta=document.getElementById('cfg-carta');
  if(carta)carta.value=c.plantillaCarta||(D.config.plantillaCarta=plantillaDefault());
  var wa=document.getElementById('cfg-wa');
  if(wa)wa.value=c.plantillaWhatsApp||(D.config.plantillaWhatsApp=plantillaWhatsAppDefault());
}

function guardarConfig(){
  D.config.mes=parseInt(document.getElementById('cfg-m').value)||1;
  D.config.anio=parseInt(document.getElementById('cfg-a').value)||new Date().getFullYear();
  aplicarArregloAConfig(true);
  D.config.congregacionExternaMes=document.getElementById('cfg-ce').value;
  D.config.diasBloqueo=parseInt(document.getElementById('cfg-d').value)||365;
  D.config.discursosLocalesRequeridos=parseInt(document.getElementById('cfg-lr').value)||1;
  D.config.scNombre=(document.getElementById('cfg-sc-n')?document.getElementById('cfg-sc-n').value.trim():'');
  D.config.scTel=(document.getElementById('cfg-sc-t')?document.getElementById('cfg-sc-t').value.trim():'');
  D.config.scEmail=(document.getElementById('cfg-sc-e')?document.getElementById('cfg-sc-e').value.trim():'');
  D.config.scObs=(document.getElementById('cfg-sc-o')?document.getElementById('cfg-sc-o').value.trim():'');
  D.planificacion.forEach(function(p){if(p._origen==='SC'){p.hermano=D.config.scNombre||p.hermano;p.telefono=D.config.scTel||p.telefono||'';p.congregacion='Superintendente de Circuito';}});
  var carta=document.getElementById('cfg-carta');if(carta)D.config.plantillaCarta=carta.value;
  var wa=document.getElementById('cfg-wa');if(wa)D.config.plantillaWhatsApp=wa.value;
  dbSaveDoc('config');;toast('Configuracion guardada','s');topMeta();
}

function agregarD(){
  var num=parseInt(document.getElementById('d-n').value);
  var tit=document.getElementById('d-t').value.trim();
  if(!num||!tit){toast('Numero y titulo obligatorios','e');return;}
  if(D.discursos.find(function(d){return d.numero===num;})){toast('Numero ya existe','e');return;}
  var item={id:uid(),numero:num,titulo:tit,estado:document.getElementById('d-e').value,obs:document.getElementById('d-o').value.trim()};
  D.discursos.push(item);
  dbUpsertItem('discursos',item);
  renderD();toast('Discurso agregado','s');
  document.getElementById('d-n').value='';document.getElementById('d-t').value='';
}

function importarDMasivo(){
  var txt=document.getElementById('iat-d').value.trim();var ok=0,sk=0;
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var num=parseInt(p[0]);var tit=(p[1]||'').trim();
    if(!num||!tit||D.discursos.find(function(d){return d.numero===num;})){sk++;return;}
    D.discursos.push({id:uid(),numero:num,titulo:tit,estado:'Activo',obs:''});ok++;
  });
  dbSaveArray('discursos');renderD();document.getElementById('iat-d').value='';toggleArea('ia-d');
  toast(ok+' importados'+(sk?', '+sk+' omitidos':''),'s');
}

function ultFechaLocalDisc(num){
  var h=(D.historial||[]).filter(function(x){return (x.tipo==='Local'||x.tipo==='Superintendente de Circuito')&&parseInt(x.numDiscurso)===parseInt(num);});
  if(!h.length)return '---';
  var s=h.filter(function(x){return x.fecha;}).sort(function(a,b){return b.fecha.localeCompare(a.fecha);});
  return s.length?s[0].fecha:'---';
}
function renderD(){
  var q=document.getElementById('bq-d').value.toLowerCase();
  var est=document.getElementById('fe-d').value;
  var lista=D.discursos.filter(function(d){return(!q||d.numero.toString().includes(q)||d.titulo.toLowerCase().includes(q))&&(!est||d.estado===est);});
  lista=lista.map(function(d){return Object.assign({},d,{ultLocal:ultFechaLocalDisc(d.numero)});});
  lista=ordenar(lista,'d','numero',1);
  var tb=document.getElementById('tb-d');
  if(!lista.length){tb.innerHTML='<tr><td colspan="7"><div class="es"><div class="ic2">&#128218;</div><p>Sin discursos</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(d){
    var sel=_sel.d.indexOf(d.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('d',d.id)+'</td>'
      +'<td><strong>'+d.numero+'</strong></td><td>'+esc(d.titulo)+'</td>'
      +'<td><span class="badge '+(d.estado==='Activo'?'bgn':'bgr')+'">'+d.estado+'</span></td>'
      +'<td>'+(d.obs?esc(d.obs):'---')+'</td>'+'<td>'+(d.ultLocal||'---')+'</td>'
      +'<td class="ac">'+btnAc('bg','editar','editD',d.id)+btnAc('bd2','x','delD',d.id)+'</td></tr>';
  }).join('');
  // restaurar estado checkboxes
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.d.indexOf(c.dataset.id)>=0;});
}

function editD(id){
  var d=D.discursos.find(function(x){return x.id===id;});if(!d)return;
  openM('Editar discurso','<div class="fgrid">'
    +'<div class="fg"><label>N</label><input id="ed-n" type="number" value="'+d.numero+'"></div>'
    +'<div class="fg"><label>Titulo</label><input id="ed-t" value="'+esc(d.titulo)+'"></div>'
    +'<div class="fg"><label>Estado</label><select id="ed-e"><option '+(d.estado==='Activo'?'selected':'')+'>Activo</option><option '+(d.estado==='Inactivo'?'selected':'')+'>Inactivo</option></select></div>'
    +'<div class="fg"><label>Obs.</label><input id="ed-o" value="'+esc(d.obs||'')+'"></div></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:function(){
      var num=parseInt(document.getElementById('ed-n').value);
      if(!num){toast('N invalido','e');return;}
      if(D.discursos.find(function(x){return x.numero===num&&x.id!==id;})){toast('Duplicado','e');return;}
      d.numero=num;d.titulo=document.getElementById('ed-t').value.trim();
      d.estado=document.getElementById('ed-e').value;d.obs=document.getElementById('ed-o').value.trim();
      sincronizarDiscursosInactivos(true);
      dbUpsertItem('discursos',d);
      sincronizarTitulosDiscursos();
      if(typeof renderD==='function'&&document.getElementById('tb-d'))renderD();
      if(typeof renderRep==='function'&&document.getElementById('tb-r'))renderRep();
      if(typeof renderCM==='function'&&document.getElementById('tb-cm'))renderCM();
      if(typeof renderPlan==='function'&&document.getElementById('tb-pe'))renderPlan();
      closeM();toast('Actualizado','s');
    }}]);
}

function delD(id){
  confirmar('Eliminar este discurso?',function(){
    D.discursos=D.discursos.filter(function(d){return d.id!==id;});
    dbDeleteItem('discursos',id);
    renderD();toast('Eliminado','s');
  });
}

function agregarH(){
  var n=document.getElementById('h-n').value.trim();if(!n){toast('Nombre obligatorio','e');return;}
  var privSelecs=[];document.querySelectorAll('.priv-chk-add:checked').forEach(function(chk){privSelecs.push(chk.dataset.id);});
  D.locales.push({id:uid(),nombre:n,nombramiento:document.getElementById('h-nom').value,
    puedeAfuera:document.getElementById('h-af').value,puedeLocal:document.getElementById('h-lo').value,
    estado:document.getElementById('h-e').value,telefono:document.getElementById('h-t').value.trim(),
    obs:document.getElementById('h-o').value.trim(),privilegios:privSelecs});
  var nh=D.locales[D.locales.length-1];dbUpsertItem('locales',nh);renderH();fillSelH();fillFRepH();toast('Hermano agregado','s');
  ['h-n','h-t','h-o'].forEach(function(i){document.getElementById(i).value='';});
}

function importarHMasivo(){
  var txt=document.getElementById('iat-h').value.trim();var ok=0,sk=0;
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var n=(p[0]||'').trim();if(!n){sk++;return;}
    if(D.locales.find(function(h){return h.nombre.toLowerCase()===n.toLowerCase();})){sk++;return;}
    var nom=(p[1]||'').toLowerCase().indexOf('anciano')>=0?'Anciano':'Siervo Ministerial';
    D.locales.push({id:uid(),nombre:n,nombramiento:nom,
      puedeAfuera:(p[2]||'si').toLowerCase()==='no'?'no':'si',
      puedeLocal:(p[3]||'si').toLowerCase()==='no'?'no':'si',
      estado:'Activo',telefono:(p[4]||'').trim(),obs:(p[5]||'').trim()});ok++;
  });
  dbSaveArray('locales');renderH();fillSelH();fillFRepH();document.getElementById('iat-h').value='';toggleArea('ia-h');
  toast(ok+' importados'+(sk?', '+sk+' omitidos':''),'s');
}


function ultimaSalidaLocal(h){
  if(!h)return null;
  var nn=normName(h.nombre||'');
  var items=[];
  (D.historial||[]).forEach(function(x){
    if(x.fecha&&x.tipo==='Local'&&nn&&normName(x.hermano||'')===nn)
      items.push(x.fecha);
  });
  (D.planificacion||[]).forEach(function(p){
    if(p.fecha&&p.tipo==='Local'&&p._hermanoId===h.id)
      items.push(p.fecha);
  });
  if(!items.length)return null;
  return items.sort(function(a,b){return b.localeCompare(a);})[0];
}

function ultimaSalidaExterna(h){
  if(!h)return null;
  var nn=normName(h.nombre||'');
  var items=[];
  (D.salidasRealizadas||[]).forEach(function(s){
    if(s.fecha&&(s.hermanoId===h.id||(nn&&normName(s.hermano||'')===nn)))
      items.push(s.fecha);
  });
  (D.historial||[]).forEach(function(x){
    if(x.fecha&&x.tipo==='Salida'&&nn&&normName(x.hermano||'')===nn)
      items.push(x.fecha);
  });
  if(!items.length)return null;
  return items.sort(function(a,b){return b.localeCompare(a);})[0];
}

function renderH(){
  var q=document.getElementById('bq-h').value.toLowerCase();
  var nom=document.getElementById('fh-nom').value;
  var af=document.getElementById('fh-af').value;
  var lista=D.locales.filter(function(h){return(!q||h.nombre.toLowerCase().includes(q))&&(!nom||h.nombramiento===nom)&&(!af||h.puedeAfuera===af);});
  lista=ordenar(lista,'h','nombre',1);
  var tb=document.getElementById('tb-h');
  if(!lista.length){tb.innerHTML='<tr><td colspan="11"><div class="es"><div class="ic2">&#128101;</div><p>Sin hermanos</p></div></td></tr>';return;}
  // Calcular y cachear ultimas salidas para sorting
  lista.forEach(function(h){
    h.ultLocal=ultimaSalidaLocal(h)||'';
    h.ultExt=ultimaSalidaExterna(h)||'';
  });
  tb.innerHTML=lista.map(function(h){
    var sel=_sel.h.indexOf(h.id)>=0;
    var ultLocal=h.ultLocal;
    var ultExt=h.ultExt;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('h',h.id)+'</td>'
      +'<td><strong>'+esc(h.nombre)+'</strong></td><td>'+h.nombramiento+'</td>'
      +'<td><span class="badge '+(h.puedeAfuera==='si'?'bgn':'bgr')+'">'+(h.puedeAfuera==='si'?'Si':'No')+'</span></td>'
      +'<td><span class="badge '+(h.puedeLocal==='si'?'bgn':'bgr')+'">'+(h.puedeLocal==='si'?'Si':'No')+'</span></td>'
      +'<td><span class="badge '+(h.estado==='Activo'?'bgn':'bgr')+'">'+h.estado+'</span></td>'
      +'<td style="font-size:12px">'+(ultLocal?fmtF(ultLocal):'<span style="color:var(--tx3)">---</span>')+'</td>'
      +'<td style="font-size:12px">'+(ultExt?fmtF(ultExt):'<span style="color:var(--tx3)">---</span>')+'</td>'
      +'<td>'+(h.telefono?esc(h.telefono):'---')+'</td><td>'+(nomPrivilegios(h)||'---')+'</td>'
      +'<td class="ac">'+btnAc('bg','editar','editH',h.id)+btnAc('bd2','x','delH',h.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.h.indexOf(c.dataset.id)>=0;})
}

function editH(id){
  var h=D.locales.find(function(x){return x.id===id;});if(!h)return;
  var privHTML='<div class="fg" style="grid-column:1/-1"><label>Privilegios adicionales</label><div id="priv-chks-edit" style="display:flex;flex-wrap:wrap;gap:8px;padding:6px 0">'
    +D.privilegios.map(function(p){var chk=(h.privilegios||[]).indexOf(p.id)>=0;return '<label style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-size:13px"><input type="checkbox" class="priv-chk-edit" data-id="'+p.id+'" '+(chk?'checked':'')+'>'+esc(p.nombre)+'</label>';}).join('')
    +'</div></div>';
  openM('Editar hermano','<div class="fgrid">'
    +'<div class="fg"><label>Nombre</label><input id="eh-n" value="'+esc(h.nombre)+'"></div>'
    +'<div class="fg"><label>Nombramiento</label><select id="eh-nom"><option '+(h.nombramiento==='Anciano'?'selected':'')+'>Anciano</option><option '+(h.nombramiento==='Siervo Ministerial'?'selected':'')+'>Siervo Ministerial</option></select></div>'
    +'<div class="fg"><label>Sale afuera</label><select id="eh-af"><option value="si" '+(h.puedeAfuera==='si'?'selected':'')+'>Si</option><option value="no" '+(h.puedeAfuera==='no'?'selected':'')+'>No</option></select></div>'
    +'<div class="fg"><label>Local</label><select id="eh-lo"><option value="si" '+(h.puedeLocal==='si'?'selected':'')+'>Si</option><option value="no" '+(h.puedeLocal==='no'?'selected':'')+'>No</option></select></div>'
    +'<div class="fg"><label>Estado</label><select id="eh-e"><option '+(h.estado==='Activo'?'selected':'')+'>Activo</option><option '+(h.estado==='Inactivo'?'selected':'')+'>Inactivo</option></select></div>'
    +'<div class="fg"><label>Tel</label><input id="eh-t" value="'+esc(h.telefono||'')+'"></div>'
    +'<div class="fg"><label>Obs.</label><input id="eh-o" value="'+esc(h.obs||'')+'"></div>'+privHTML+'</div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:function(){
      h.nombre=document.getElementById('eh-n').value.trim();h.nombramiento=document.getElementById('eh-nom').value;
      var privEdit=[];document.querySelectorAll('.priv-chk-edit:checked').forEach(function(chk){privEdit.push(chk.dataset.id);});h.privilegios=privEdit;
      h.puedeAfuera=document.getElementById('eh-af').value;h.puedeLocal=document.getElementById('eh-lo').value;
      h.estado=document.getElementById('eh-e').value;h.telefono=document.getElementById('eh-t').value.trim();
      h.obs=document.getElementById('eh-o').value.trim();
      dbUpsertItem('locales',h);renderH();fillSelH();closeM();toast('Actualizado','s');
    }}]);
}

function delH(id){
  confirmar('Eliminar este hermano?',function(){
    var repsElim=D.repertorioLocal.filter(function(r){return r.hermanoId===id;});
    D.locales=D.locales.filter(function(h){return h.id!==id;});
    D.repertorioLocal=D.repertorioLocal.filter(function(r){return r.hermanoId!==id;});
    dbDeleteItem('locales',id);
    repsElim.forEach(function(r){dbDeleteItem('repertorioLocal',r.id);});
    renderH();fillSelH();toast('Eliminado','s');
  });
}

function fillSelH(){
  var sel=document.getElementById('rep-h');if(!sel)return;var v=sel.value;
  sel.innerHTML='<option value="">-- Seleccionar --</option>'+D.locales.filter(function(h){return h.estado==='Activo';}).sort(function(a,b){return a.nombre.localeCompare(b.nombre);}).map(function(h){return '<option value="'+h.id+'">'+esc(h.nombre)+'</option>';}).join('');
  if(v)sel.value=v;
}

function fillFRepH(){
  var sel=document.getElementById('frep-h');if(!sel)return;var v=sel.value;
  sel.innerHTML='<option value="">Todos</option>'+D.locales.sort(function(a,b){return a.nombre.localeCompare(b.nombre);}).map(function(h){return '<option value="'+h.id+'">'+esc(h.nombre)+'</option>';}).join('');
  if(v)sel.value=v;
}

function discursoCat(num){
  var n=parseInt(num);
  if(!n)return null;
  return (D.discursos||[]).find(function(d){return parseInt(d.numero)===n;})||null;
}

function esDiscursoInactivo(num){
  var d=discursoCat(num);
  return !!(d&&d.estado==='Inactivo');
}

function esDiscursoActivo(num){
  var d=discursoCat(num);
  return !d||d.estado!=='Inactivo';
}

function tituloDiscursoActivo(num){
  var d=discursoCat(num);
  return d&&d.estado!=='Inactivo'?d.titulo:'';
}

function planPermiteDiscurso(p){
  return esSC(p)||!p.numDiscurso||esDiscursoActivo(p.numDiscurso);
}

function filaTieneDiscursoActivo(o){
  return !o||!o.numDiscurso||esDiscursoActivo(o.numDiscurso);
}

function sincronizarDiscursosInactivos(mostrarToast){
  var numsInactivos=(D.discursos||[]).filter(function(d){return d.estado==='Inactivo';}).map(function(d){return parseInt(d.numero);});
  if(!numsInactivos.length)return{repertorios:0,planificacion:0};
  var reps=0,plans=0;
  (D.repertorioLocal||[]).forEach(function(r){
    if(r&&numsInactivos.indexOf(parseInt(r.numDiscurso))>=0&&r.estado==='Activo'){
      r.estado='Inactivo';reps++;
    }
  });
  (D.planificacion||[]).forEach(function(p){
    if(p&&!esSC(p)&&p.numDiscurso&&numsInactivos.indexOf(parseInt(p.numDiscurso))>=0){
      p.numDiscurso='';p.titulo='';p.confirmado='Por confirmar';plans++;
    }
  });
  if(mostrarToast&&(reps||plans))toast('Discurso inactivo aplicado: '+reps+' repertorio(s) desactivado(s) y '+plans+' fila(s) de planificacion reiniciada(s).','w');
  return{repertorios:reps,planificacion:plans};
}

function autoTitRep(){var n=parseInt(document.getElementById('rep-n').value);document.getElementById('rep-t').value=tituloDiscursoActivo(n);}

function agregarRep(){
  var hId=document.getElementById('rep-h').value;var num=parseInt(document.getElementById('rep-n').value);
  if(!hId||!num){toast('Hermano y N obligatorios','e');return;}
  if(D.repertorioLocal.find(function(r){return r.hermanoId===hId&&r.numDiscurso===num;})){toast('Ya existe','e');return;}
  var h=D.locales.find(function(x){return x.id===hId;});
  var af=document.getElementById('rep-af').value;
  if(h&&h.puedeAfuera==='no'&&af==='si'){af='no';toast('Hermano no puede salir, marcado No','w');}
  var d=discursoCat(num),est=document.getElementById('rep-e').value;
  if(d&&d.estado==='Inactivo'){est='Inactivo';toast('El discurso esta inactivo; el repertorio se guardara inactivo.','w');}
  D.repertorioLocal.push({id:uid(),hermanoId:hId,numDiscurso:num,titulo:(d&&d.estado!=='Inactivo')?d.titulo:document.getElementById('rep-t').value.trim(),
    puedeLocal:document.getElementById('rep-lo').value,puedeAfuera:af,estado:est,obs:document.getElementById('rep-o').value.trim()});
  var nr=D.repertorioLocal[D.repertorioLocal.length-1];dbUpsertItem('repertorioLocal',nr);renderRep();renderPlan();toast('Agregado','s');
  ['rep-n','rep-t','rep-o'].forEach(function(i){document.getElementById(i).value='';});
}

function importarRMasivo(){
  var txt=document.getElementById('iat-r').value.trim();var ok=0,sk=0,inact=0;
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var nh=(p[0]||'').trim();var num=parseInt(p[1]);if(!nh||!num){sk++;return;}
    var h=D.locales.find(function(x){return x.nombre.toLowerCase()===nh.toLowerCase();});if(!h){sk++;return;}
    if(D.repertorioLocal.find(function(r){return r.hermanoId===h.id&&r.numDiscurso===num;})){sk++;return;}
    var lo=(p[2]||'si').toLowerCase()==='no'?'no':'si';
    var af=(p[3]||'si').toLowerCase()==='no'?'no':'si';
    if(h.puedeAfuera==='no')af='no';
    var d=discursoCat(num),estado='Activo';
    if(d&&d.estado==='Inactivo'){estado='Inactivo';inact++;}
    D.repertorioLocal.push({id:uid(),hermanoId:h.id,numDiscurso:num,titulo:(d&&d.estado!=='Inactivo')?d.titulo:'',puedeLocal:lo,puedeAfuera:af,estado:estado,obs:(p[4]||'').trim()});ok++;
  });
  dbSaveArray('repertorioLocal');renderRep();renderPlan();document.getElementById('iat-r').value='';toggleArea('ia-r');
  toast(ok+' importados'+(sk?', '+sk+' omitidos':'')+(inact?', '+inact+' inactivo(s)':'') ,'s');
}

function ultimaSalida(num){
  if(esDiscursoInactivo(num))return null;
  var n=parseInt(num),ref=refMesISO?refMesISO():refMes().slice(0,10);
  var ents=(D.salidasRealizadas||[]).filter(function(s){return parseInt(s.numDiscurso)===n&&s.fecha&&s.fecha<ref;});
  if(!ents.length)return null;
  return ents.sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);})[0].fecha;
}

function limiteSalidaMeses(h){return h&&h.nombramiento==='Anciano'?2:4;}

function limiteSalidaDias(h){return limiteSalidaMeses(h)*30;}

function refMesISO(){return refMes().slice(0,10);}

function fechaCorteSalida(h){
  var r=new Date(refMesISO()+'T00:00:00');
  r.setMonth(r.getMonth()-limiteSalidaMeses(h));
  var y=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,'0'),d=String(r.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+d;
}

function cumpleRotacionSalida(h,fecha){return !fecha||fecha<fechaCorteSalida(h);}

function ymConfig(){return D.config.anio+'-'+String(D.config.mes).padStart(2,'0');}

function esAsignacionLocalPlan(p){return p&&(p.tipo==='Salida'||p.tipo==='Local'||p._origen==='Local');}

function mismoHermanoPlan(p,h){
  if(!p||!h)return false;
  return (p._hermanoId&&p._hermanoId===h.id)||normName(p.hermano||'')===normName(h.nombre||'');
}

function asignacionesHermano(h,excluirPlanId){
  if(!h)return [];
  var nn=normName(h.nombre||''),items=[];
  (D.salidasRealizadas||[]).forEach(function(s){
    if(s.fecha&&(s.hermanoId===h.id||(nn&&normName(s.hermano||'')===nn))){
      items.push({fecha:s.fecha,origen:'Salida realizada'});
    }
  });
  (D.historial||[]).forEach(function(x){
    if(x.fecha&&x.tipo==='Local'&&nn&&normName(x.hermano||'')===nn){
      items.push({fecha:x.fecha,origen:'Historial interno'});
    }
  });
  (D.planificacion||[]).forEach(function(p){
    if(!p.fecha||p.id===excluirPlanId||!esAsignacionLocalPlan(p)||!mismoHermanoPlan(p,h))return;
    items.push({fecha:p.fecha,origen:p.tipo==='Salida'?'Salida planificada':'Planificacion local'});
  });
  return items;
}

function ultimaAsignacionHermano(h,excluirPlanId){
  var ref=refMesISO();
  var items=asignacionesHermano(h,excluirPlanId).filter(function(x){return x.fecha&&x.fecha<ref;});
  if(!items.length)return null;
  return items.sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);})[0];
}

function asignacionMesHermano(h,excluirPlanId){
  var ym=ymConfig();
  return asignacionesHermano(h,excluirPlanId).find(function(x){return x.fecha&&x.fecha.slice(0,7)===ym;})||null;
}

function ultimaSalidaHermano(hermanoId,excluirPlanId){
  var h=D.locales.find(function(x){return x.id===hermanoId;});
  var ult=ultimaAsignacionHermano(h,excluirPlanId);
  return ult?ult.fecha:null;
}

function calcRecSalida(hermanoId,excluirPlanId){
  var h=D.locales.find(function(x){return x.id===hermanoId;});
  if(!h)return{ultima:'Nunca',dias:Infinity,estado:'Disponible',motivo:''};
  var mes=asignacionMesHermano(h,excluirPlanId);
  if(mes)return{ultima:mes.fecha,dias:0,estado:'Bloqueado',motivo:'Ya tiene asignacion en el mes configurado'};
  var ult=ultimaAsignacionHermano(h,excluirPlanId);
  if(!ult)return{ultima:'Nunca',dias:Infinity,estado:'Disponible',motivo:''};
  var dias=diasDesde(ult.fecha,refMes());
  if(isNaN(dias))return{ultima:ult.fecha,dias:Infinity,estado:'Disponible',motivo:ult.origen||''};
  var ok=cumpleRotacionSalida(h,ult.fecha);
  return{ultima:ult.fecha,dias:dias,estado:ok?'Disponible':'Bloqueado',motivo:ult.origen||'',limite:limiteSalidaDias(h),limiteMeses:limiteSalidaMeses(h),corte:fechaCorteSalida(h)};
}

function repUsoHTML(fecha){
  var db=D.config.diasBloqueo||365;
  if(!fecha)return '<span class="badge bbl">Nunca</span>';
  var dias=diasDesde(fecha,refMes());
  var cls=dias<db?'bye':'bgn';
  var adv=dias<db?' <span style="color:var(--ye);font-weight:700">&#9888;</span>':'';
  return '<span class="badge '+cls+'">'+fmtF(fecha)+'</span><br><span style="font-size:11px;color:var(--tx3)">'+dias+' dias al 1 de '+nMes(D.config.mes)+adv+'</span>';
}


/* Obtener titulo de discurso siempre desde el catalogo */
function tituloDisc(num){
  if(!num)return '';
  var d=D.discursos.find(function(x){return parseInt(x.numero)===parseInt(num);});
  return d?d.titulo:'';
}
function renderRep(){
  if(!document.getElementById('tb-r'))return;
  var q=(document.getElementById('bq-r').value||'').toLowerCase();
  var hf=document.getElementById('frep-h').value;
  var lista=D.repertorioLocal.filter(function(r){
    var tit=tituloDisc(r.numDiscurso).toLowerCase();
    return(!hf||r.hermanoId===hf)&&(!q||(r.numDiscurso||'').toString().includes(q)||tit.includes(q));
  }).map(function(r){
    var h=D.locales.find(function(x){return x.id===r.hermanoId;});
    var tit=tituloDisc(r.numDiscurso);
    var ultCong=ultimaVez(parseInt(r.numDiscurso));
    var ultSal=ultimaSalida(parseInt(r.numDiscurso));
    return Object.assign({},r,{
      _nombre:h?h.nombre:'---',
      _titulo:tit,
      _ultCong:ultCong,
      _ultCongDias:ultCong?diasDesde(ultCong,refMes()):Infinity,
      _ultSal:ultSal,
      _ultSalDias:ultSal?diasDesde(ultSal,refMes()):Infinity
    });
  });
  lista=ordenar(lista,'r','_nombre',1);
  var tb=document.getElementById('tb-r');
  if(!lista.length){tb.innerHTML='<tr><td colspan="11"><div class="es"><div class="ic2">&#127897;</div><p>Sin repertorio</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(r){
    var sel=_sel.r.indexOf(r.id)>=0;
    var uc=r._ultCong?fmtF(r._ultCong)+'<br><span style="font-size:11px;color:var(--tx3)">'+r._ultCongDias+' dias</span>':'---';
    var us=r._ultSal?fmtF(r._ultSal)+'<br><span style="font-size:11px;color:var(--tx3)">'+r._ultSalDias+' dias</span>':'---';
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('r',r.id)+'</td>'
      +'<td><strong>'+esc(r._nombre)+'</strong></td>'
      +'<td>'+esc(r.numDiscurso||'')+'</td>'
      +'<td>'+esc(r._titulo)+'</td>'
      +'<td><span class="badge '+(r.puedeAfuera==='si'?'bgn':'bgr')+'">'+(r.puedeAfuera==='si'?'Si':'No')+'</span></td>'
      +'<td><span class="badge '+(r.puedeLocal==='si'?'bgn':'bgr')+'">'+(r.puedeLocal==='si'?'Si':'No')+'</span></td>'
      +'<td><span class="badge '+(r.estado==='Activo'?'bgn':'bgr')+'">'+esc(r.estado)+'</span></td>'
      +'<td>'+uc+'</td>'
      +'<td>'+us+'</td>'
      +'<td>'+(r.obs?esc(r.obs):'---')+'</td>'
      +'<td class="ac">'+btnAc('bg','editar','editRep',r.id)+btnAc('bd2','x','delRep',r.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.r.indexOf(c.dataset.id)>=0;});
}

function delRep(id){
  confirmar('Eliminar del repertorio?',function(){
    D.repertorioLocal=D.repertorioLocal.filter(function(r){return r.id!==id;});
    dbDeleteItem('repertorioLocal',id);
    renderRep();toast('Eliminado','s');
  });
}

function exportarRepPDF(){var w=window.open('','_blank');w.document.write(buildRepHTML());w.document.close();setTimeout(function(){w.print();},600);}

function exportarRepWord(){descargarWordHTML('oradores_'+new Date().toISOString().slice(0,10),'Oradores disponibles',buildRepHTML());}

function docTxt(v){return esc((v||'').toString().trim()||'---');}

function docReunion(dia,horario){var d=nomDia(dia);var h=(horario||'').toString().trim();return docTxt((d?d:'')+(d&&h?' - ':'')+h);}

function docCoord(nombre,tel,email){
  var p=[];if(nombre)p.push(nombre);if(tel)p.push(tel);if(email)p.push(email);
  return docTxt(p.join(' | ')||'---');
}

function extraerBodyHTML(html){
  var m=(html||'').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m?m[1]:(html||'');
}

function estilosWordBase(){
  return [
    '@page WordSection1{size:21cm 29.7cm;margin:2cm 1.8cm 2cm 1.8cm;mso-page-orientation:portrait;}',
    'div.WordSection1{page:WordSection1;}',
    'body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#222;margin:0;line-height:1.35;}',
    'p{margin:0 0 8pt 0;line-height:1.45;}',
    '.doc-head{text-align:center;margin-bottom:12pt;}',
    '.doc-head h1{font-size:16pt;margin:0 0 3pt 0;text-align:center;font-weight:bold;}',
    '.doc-sub{font-size:11.5pt;font-weight:bold;margin-bottom:9pt;text-align:center;}',
    '.doc-box{border:1pt solid #999;padding:8pt 10pt;line-height:1.45;margin:9pt 0 12pt 0;page-break-inside:avoid;}',
    '.box-title{font-weight:bold;text-transform:uppercase;font-size:9pt;letter-spacing:.03em;margin-bottom:4pt;}',
    'h1.titulo{font-size:12.5pt;font-weight:bold;text-align:center;text-transform:uppercase;margin:0 0 14pt 0;}',
    '.destinatario{margin-bottom:12pt;font-size:10.5pt;}',
    '.saludo{margin-bottom:10pt;font-size:10.5pt;}',
    '.cuerpo p{margin:0 0 8pt 0;line-height:1.45;text-align:justify;}',
    '.cuerpo ul{margin:4pt 0 9pt 18pt;line-height:1.45;padding-left:0;}',
    '.cuerpo li{margin-bottom:3pt;}',
    '.firma-wrap{margin-top:24pt;text-align:center;page-break-inside:avoid;}',
    '.firma-nombre{font-weight:bold;font-size:10.5pt;}',
    '.firma-cargo,.firma-contacto{font-size:9.5pt;color:#444;}',
    'h2,h2.anexo{font-size:10.5pt;font-weight:bold;margin:16pt 0 7pt 0;text-transform:uppercase;border-bottom:1.5pt solid #333;padding-bottom:3pt;page-break-after:avoid;}',
    'table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:6pt;mso-table-lspace:0pt;mso-table-rspace:0pt;page-break-inside:auto;}',
    'thead{display:table-header-group;}',
    'tr{page-break-inside:avoid;page-break-after:auto;}',
    'th{background:#2D5483;color:#fff;border:1pt solid #2D5483;padding:5pt 6pt;text-align:left;font-size:9pt;font-weight:bold;vertical-align:top;}',
    'td{border:1pt solid #d7d7d7;padding:5pt 6pt;font-size:9.5pt;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;}',
    '.contactos th{font-size:8.5pt;border-bottom:1pt solid #999;padding:4pt;color:#222;background:#f2f2f2;}',
    '.contactos td{font-size:9pt;border-bottom:1pt solid #ddd;padding:4pt;vertical-align:top;}',
    '.empty{font-size:9.5pt;color:#777;margin:8pt 0 12pt 0;text-align:center;}',
    '.pag2,.page-break{page-break-before:always;padding-top:0;}',
    '.rep-grid{display:block;margin-top:10pt;}',
    '.rep-card{border:1pt solid #bbb;padding:7pt 8pt;margin:0 0 8pt 0;page-break-inside:avoid;}',
    '.rep-nombre{font-weight:bold;font-size:10pt;color:#2D5483;}',
    '.rep-cargo{font-size:9pt;color:#555;margin-bottom:4pt;}',
    '.rep-disc{font-size:9pt;color:#333;line-height:1.45;}',
    '.footer{margin-top:14pt;font-size:8pt;color:#777;text-align:right;}',
    'strong{font-weight:bold;}',
    'em{font-style:italic;}',
    '.small{font-size:8.5pt;color:#555;line-height:1.25;}',
    'a{color:#222;text-decoration:none;}'
  ].join('');
}

function buildWordShell(titulo,html){
  var body=extraerBodyHTML(html).replace(/<script[\s\S]*?<\/script>/gi,'');
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head>'
    +'<meta charset="UTF-8"><meta name="ProgId" content="Word.Document"><meta name="Generator" content="Coordinacion Discursos Publicos"><title>'+esc(titulo||'Documento')+'</title>'
    +'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->'
    +'<style>'+estilosWordBase()+'</style></head><body><div class="WordSection1">'+body+'</div></body></html>';
}

function descargarWordHTML(nombre,titulo,html){
  var doc='\ufeff'+buildWordShell(titulo,html);
  var b=new Blob([doc],{type:'application/msword;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download=nombre.replace(/[^a-z0-9_\-\.]+/gi,'_')+'.doc';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  toast('Word generado','s');
}

function docLocalHeader(titulo,subtitulo){
  var mc=D.miCongr||{};
  return '<div class="doc-head">'
    +'<h1>'+docTxt(titulo)+'</h1>'
    +(subtitulo?'<div class="doc-sub">'+docTxt(subtitulo)+'</div>':'')
    +'<div class="doc-box">'
    +'<div><strong>Congregacion:</strong> '+docTxt(mc.nombre||'Mi Congregacion')+'</div>'
    +'<div><strong>Direccion del Salon:</strong> '+docTxt(mc.direccion)+'</div>'
    +'<div><strong>Dia y horario de reunion:</strong> '+docReunion(mc.dia,mc.horario)+'</div>'
    +'<div><strong>Coordinador de discursos publicos:</strong> '+docCoord(mc.coordNombre,mc.coordTel,mc.coordEmail)+'</div>'
    +(mc.obs?'<div><strong>Observacion:</strong> '+docTxt(mc.obs)+'</div>':'')
    +'</div></div>';
}

function buildRepHTML(){
  var pS=D.locales.filter(function(h){return h.puedeAfuera==='si'&&h.estado==='Activo';}).sort(function(a,b){return a.nombre.localeCompare(b.nombre);});
  var filas=pS.map(function(h){
    var ds=D.repertorioLocal.filter(function(r){return r.hermanoId===h.id&&r.puedeAfuera==='si'&&r.estado==='Activo';}).map(function(r){return r.numDiscurso;}).sort(function(a,b){return a-b;}).join(' - ');
    return '<tr><td>'+docTxt(h.nombre)+'</td><td>'+docTxt(h.nombramiento)+'</td><td>'+docTxt(h.telefono)+'</td><td>'+docTxt(ds)+'</td></tr>';
  }).join('');
  if(!filas)filas='<tr><td colspan="4" class="empty">Sin hermanos disponibles para salir.</td></tr>';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Oradores disponibles</title>'
    +'<style>body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;margin:38px;max-width:850px}.doc-head{text-align:left;margin-bottom:22px}.doc-head h1{text-align:center;font-size:20px;margin:0 0 4px}.doc-sub{text-align:center;font-size:14px;font-weight:bold;margin-bottom:14px}.doc-box{border:1px solid #999;padding:12px 14px;line-height:1.55;margin-top:14px}table{width:100%;border-collapse:collapse;margin-top:14px}th{padding:8px 10px;text-align:left;border-bottom:2px solid #333;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #ccc;vertical-align:top}.empty{text-align:center;color:#777;padding:18px}.footer{margin-top:26px;font-size:10px;color:#777;text-align:right}</style></head><body>'
    +docLocalHeader('Oradores disponibles para discursos publicos','Hermanos locales autorizados para salir')
    +'<table><thead><tr><th>Nombre</th><th>Nombramiento</th><th>Telefono</th><th>N Discursos</th></tr></thead><tbody>'+filas+'</tbody></table>'
    +'<div class="footer">Generado el '+new Date().toLocaleDateString('es-CL')+'</div></body></html>';
}

function agregarCE(){
  var n=document.getElementById('ce-n').value.trim();if(!n){toast('Nombre obligatorio','e');return;}
  D.congregaciones.push({id:uid(),nombre:n,estado:document.getElementById('ce-e').value,
    direccion:document.getElementById('ce-d').value.trim(),dia:document.getElementById('ce-dia').value,
    horario:document.getElementById('ce-h').value.trim(),coordNombre:document.getElementById('ce-cn').value.trim(),
    coordTel:document.getElementById('ce-ct').value.trim(),coordEmail:document.getElementById('ce-ce').value.trim(),
    obs:document.getElementById('ce-o').value.trim()});
  var nc=D.congregaciones[D.congregaciones.length-1];dbUpsertItem('congregaciones',nc);renderCE();poblarSelCE();poblarSelCMCong();toast('Congregacion agregada','s');
  ['ce-n','ce-d','ce-h','ce-cn','ce-ct','ce-ce','ce-o'].forEach(function(i){document.getElementById(i).value='';});
}

function importarCEMasivo(){
  var txt=document.getElementById('iat-ce').value.trim();var ok=0,sk=0;
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var n=(p[0]||'').trim();if(!n){sk++;return;}
    if(D.congregaciones.find(function(c){return c.nombre.toLowerCase()===n.toLowerCase();})){sk++;return;}
    var dv=parseInt(p[2]);if(isNaN(dv))dv=0;
    D.congregaciones.push({id:uid(),nombre:n,estado:'Activa',direccion:(p[1]||'').trim(),dia:dv.toString(),
      horario:(p[3]||'').trim(),coordNombre:(p[4]||'').trim(),coordTel:(p[5]||'').trim(),coordEmail:(p[6]||'').trim(),obs:(p[7]||'').trim()});ok++;
  });
  dbUpsertItem('congregaciones',ce);renderCE();poblarSelCE();poblarSelCMCong();document.getElementById('iat-ce').value='';toggleArea('ia-ce');
  toast(ok+' importadas'+(sk?', '+sk+' omitidas':''),'s');
}

function renderCE(){
  if(!document.getElementById('tb-ce'))return;
  var q=document.getElementById('bq-ce').value.toLowerCase();
  var lista=D.congregaciones.filter(function(c){return !q||c.nombre.toLowerCase().includes(q);});
  lista=ordenar(lista,'ce','nombre',1);
  var tb=document.getElementById('tb-ce');
  if(!lista.length){tb.innerHTML='<tr><td colspan="9"><div class="es"><div class="ic2">&#127963;</div><p>Sin congregaciones</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(c){
    var sel=_sel.ce.indexOf(c.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('ce',c.id)+'</td>'
      +'<td><strong>'+esc(c.nombre)+'</strong></td>'
      +'<td><span class="badge '+(c.estado==='Activa'?'bgn':'bgr')+'">'+c.estado+'</span></td>'
      +'<td>'+esc(c.direccion||'---')+'</td><td>'+nomDia(c.dia)+'</td><td>'+esc(c.horario||'---')+'</td>'
      +'<td>'+esc(c.coordNombre||'---')+'</td><td>'+esc(c.coordTel||'---')+'</td>'
      +'<td class="ac">'+btnAc('bg','editar','editCE',c.id)+btnAc('bd2','x','delCE',c.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.ce.indexOf(c.dataset.id)>=0;});
}

function editCE(id){
  var c=D.congregaciones.find(function(x){return x.id===id;});if(!c)return;
  openM('Editar congregacion','<div class="fgrid">'
    +'<div class="fg"><label>Nombre</label><input id="ece-n" value="'+esc(c.nombre)+'"></div>'
    +'<div class="fg"><label>Estado</label><select id="ece-e"><option '+(c.estado==='Activa'?'selected':'')+'>Activa</option><option '+(c.estado==='Inactiva'?'selected':'')+'>Inactiva</option></select></div>'
    +'<div class="fg"><label>Direccion</label><input id="ece-d" value="'+esc(c.direccion||'')+'"></div>'
    +'<div class="fg"><label>Dia discurso</label><select id="ece-dia"><option value="0" '+(c.dia==='0'?'selected':'')+'>Domingo</option><option value="1" '+(c.dia==='1'?'selected':'')+'>Lunes</option><option value="2" '+(c.dia==='2'?'selected':'')+'>Martes</option><option value="3" '+(c.dia==='3'?'selected':'')+'>Miercoles</option><option value="4" '+(c.dia==='4'?'selected':'')+'>Jueves</option><option value="5" '+(c.dia==='5'?'selected':'')+'>Viernes</option><option value="6" '+(c.dia==='6'?'selected':'')+'>Sabado</option></select></div>'
    +'<div class="fg"><label>Horario</label><input id="ece-h" value="'+esc(c.horario||'')+'"></div>'
    +'<div class="fg"><label>Coord. nombre</label><input id="ece-cn" value="'+esc(c.coordNombre||'')+'"></div>'
    +'<div class="fg"><label>Coord. tel</label><input id="ece-ct" value="'+esc(c.coordTel||'')+'"></div>'
    +'<div class="fg"><label>Coord. email</label><input id="ece-ce" value="'+esc(c.coordEmail||'')+'"></div>'
    +'<div class="fg"><label>Obs.</label><input id="ece-o" value="'+esc(c.obs||'')+'"></div></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:function(){
      c.nombre=document.getElementById('ece-n').value.trim();c.estado=document.getElementById('ece-e').value;
      c.direccion=document.getElementById('ece-d').value.trim();c.dia=document.getElementById('ece-dia').value;
      c.horario=document.getElementById('ece-h').value.trim();c.coordNombre=document.getElementById('ece-cn').value.trim();
      c.coordTel=document.getElementById('ece-ct').value.trim();c.coordEmail=document.getElementById('ece-ce').value.trim();
      c.obs=document.getElementById('ece-o').value.trim();
      dbSaveArray('congregaciones');renderCE();poblarSelCE();poblarSelCMCong();closeM();toast('Actualizado','s');
    }}]);
}

function delCE(id){
  confirmar('Eliminar esta congregacion?',function(){
    D.congregaciones=D.congregaciones.filter(function(c){return c.id!==id;});
    dbDeleteItem('congregaciones',id);
    renderCE();poblarSelCE();poblarSelArreglos&&poblarSelArreglos();toast('Eliminada','s');
  });
}

function normalizarArreglo(a){
  if(!a.id)a.id=uid();
  a.mes=parseInt(a.mes)||D.config.mes||1;
  a.anio=parseInt(a.anio)||D.config.anio||new Date().getFullYear();
  if(!a.congregacion&&a.nombre)a.congregacion=a.nombre;
  if(!a.estado)a.estado='Conversado';
  ['direccion','horario','coordNombre','coordTel','coordEmail','obs'].forEach(function(k){if(a[k]===undefined)a[k]='';});
  if(a.dia===undefined||a.dia===null||a.dia==='')a.dia='0';
  if(!a.createdAt)a.createdAt=new Date().toISOString();
  a.updatedAt=a.updatedAt||a.createdAt;
  return a;
}

function buscarCongregacion(nombre){
  var nn=normName(nombre);
  return D.congregaciones.find(function(c){return normName(c.nombre)===nn;});
}

function datosDesdeCong(c){
  return {direccion:c.direccion||'',dia:(c.dia===undefined?'0':c.dia),horario:c.horario||'',coordNombre:c.coordNombre||'',coordTel:c.coordTel||'',coordEmail:c.coordEmail||'',obs:c.obs||''};
}

function upsertCongDesdeArreglo(a){
  var n=(a.congregacion||'').trim();if(!n)return null;
  var c=buscarCongregacion(n);
  if(!c){
    c={id:uid(),nombre:n,estado:'Activa',direccion:'',dia:'0',horario:'',coordNombre:'',coordTel:'',coordEmail:'',obs:''};
    D.congregaciones.push(c);
  }
  if(a.direccion)c.direccion=a.direccion;
  if(a.dia!==undefined&&a.dia!==null&&a.dia!=='')c.dia=a.dia.toString();
  if(a.horario)c.horario=a.horario;
  if(a.coordNombre)c.coordNombre=a.coordNombre;
  if(a.coordTel)c.coordTel=a.coordTel;
  if(a.coordEmail)c.coordEmail=a.coordEmail;
  if(a.obs&&!c.obs)c.obs=a.obs;
  if(!c.estado)c.estado='Activa';
  return c;
}

function setArForm(a){
  a=a||{};
  var now=new Date();
  var vals={m:a.mes||D.config.mes||now.getMonth()+1,a:a.anio||D.config.anio||now.getFullYear(),c:a.congregacion||'',e:a.estado||'Conversado',d:a.direccion||'',dia:(a.dia===undefined?'0':a.dia),h:a.horario||'',cn:a.coordNombre||'',ct:a.coordTel||'',ce:a.coordEmail||'',o:a.obs||''};
  Object.keys(vals).forEach(function(k){var el=document.getElementById('ar-'+k);if(el)el.value=vals[k];});
}

function limpiarCamposDatosArreglo(){
  ['ar-d','ar-h','ar-cn','ar-ct','ar-ce','ar-o'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  var dia=document.getElementById('ar-dia');if(dia)dia.value='0';
}

function limpiarFormArreglo(){setArForm({mes:(document.getElementById('ar-m')||{}).value||D.config.mes,anio:(document.getElementById('ar-a')||{}).value||D.config.anio});limpiarCamposDatosArreglo();}

function existeArregloMes(mes,anio){
  return (D.arreglos||[]).some(function(a){return parseInt(a.mes)===parseInt(mes)&&parseInt(a.anio)===parseInt(anio)&&a.estado!=='Cancelado';});
}

function siguienteMesDisponible(mes,anio){
  var m=parseInt(mes)||D.config.mes||new Date().getMonth()+1;
  var y=parseInt(anio)||D.config.anio||new Date().getFullYear();
  for(var i=0;i<120;i++){
    m++;
    if(m>12){m=1;y++;}
    if(!existeArregloMes(m,y))return {mes:m,anio:y};
  }
  return {mes:m,anio:y};
}

function avanzarFormArregloDespuesGuardar(mes,anio){
  var sig=siguienteMesDisponible(mes,anio);
  setArForm({mes:sig.mes,anio:sig.anio,estado:'Conversado'});
  var y=document.getElementById('ar-y');
  if(y){poblarAnioArreglos();y.value=sig.anio;}
}

function poblarDatalistAr(){
  var dl=document.getElementById('ar-congs');if(!dl)return;
  dl.innerHTML=D.congregaciones.slice().sort(function(a,b){return a.nombre.localeCompare(b.nombre);}).map(function(c){return '<option value="'+esc(c.nombre)+'"></option>';}).join('');
}

function poblarAnioArreglos(){
  var sel=document.getElementById('ar-y');if(!sel)return;
  var actual=new Date().getFullYear();
  var years={};
  years[actual]=true;years[D.config.anio||actual]=true;
  (D.arreglos||[]).forEach(function(a){years[parseInt(a.anio)||actual]=true;});
  for(var y=actual-1;y<=actual+5;y++)years[y]=true;
  var arr=Object.keys(years).map(Number).sort(function(a,b){return a-b;});
  var val=sel.value||String(actual);
  sel.innerHTML=arr.map(function(y){return '<option value="'+y+'">'+y+'</option>';}).join('');
  sel.value=arr.indexOf(parseInt(val))>=0?val:String(actual);
}

function loadArreglosUI(){
  poblarDatalistAr();poblarAnioArreglos();setArForm({mes:D.config.mes,anio:D.config.anio});
  renderArreglos();
}

function autocompletarArregloCong(){
  var n=(document.getElementById('ar-c')||{}).value||'';
  var c=buscarCongregacion(n);
  if(!c){limpiarCamposDatosArreglo();return;}
  var d=datosDesdeCong(c);
  [['ar-d',d.direccion],['ar-dia',d.dia],['ar-h',d.horario],['ar-cn',d.coordNombre],['ar-ct',d.coordTel],['ar-ce',d.coordEmail],['ar-o',d.obs]].forEach(function(p){var el=document.getElementById(p[0]);if(el)el.value=p[1]||'';});
}

function leerArForm(){
  return normalizarArreglo({
    id:uid(),mes:parseInt(document.getElementById('ar-m').value)||1,anio:parseInt(document.getElementById('ar-a').value)||new Date().getFullYear(),
    congregacion:document.getElementById('ar-c').value.trim(),estado:document.getElementById('ar-e').value,
    direccion:document.getElementById('ar-d').value.trim(),dia:document.getElementById('ar-dia').value,horario:document.getElementById('ar-h').value.trim(),
    coordNombre:document.getElementById('ar-cn').value.trim(),coordTel:document.getElementById('ar-ct').value.trim(),coordEmail:document.getElementById('ar-ce').value.trim(),obs:document.getElementById('ar-o').value.trim(),
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  });
}

function agregarArreglo(){
  var a=leerArForm();
  if(!a.congregacion){toast('Congregacion obligatoria','e');return;}
  upsertCongDesdeArreglo(a);
  D.arreglos.push(a);
  dbSaveArray('arreglos');poblarDatalistAr();poblarSelCE();poblarSelCMCong();poblarAnioArreglos();
  avanzarFormArregloDespuesGuardar(a.mes,a.anio);
  renderArreglos();aplicarArregloAConfig();toast('Arreglo guardado. Formulario avanzado al siguiente mes disponible.','s');
}

function arEstadoBadge(e){var c=e==='Confirmado'?'bgn':e==='Cancelado'?'brd':e==='Cerrado'?'bgr':e==='Pendiente datos'?'bye':'bbl';return '<span class="badge '+c+'">'+esc(e||'Conversado')+'</span>';}

function telWhatsApp(t){var n=(t||'').replace(/\D/g,'');if(!n)return '';if(n.length===8)n='569'+n;if(n.length===9&&n[0]==='9')n='56'+n;if(n.length===11&&n.indexOf('56')!==0)n='56'+n;return n;}

function abrirWhatsAppCoord(id){
  var a=D.arreglos.find(function(x){return x.id===id;});if(!a||!a.coordTel){toast('Sin telefono de coordinador','w');return;}
  var tel=telWhatsApp(a.coordTel);if(!tel){toast('Telefono invalido','e');return;}
  var msg=aplicarMarcadoresWhatsApp(D.config.plantillaWhatsApp||plantillaWhatsAppDefault(),a);
  window.open('https://web.whatsapp.com/send?phone='+encodeURIComponent(tel)+'&text='+encodeURIComponent(msg),'_blank');
}

function arreglosFiltradosAnio(){
  var y=parseInt((document.getElementById('ar-y')||{}).value)||D.config.anio||new Date().getFullYear();
  return (D.arreglos||[]).filter(function(a){return parseInt(a.anio)===y;});
}

function renderArreglos(){
  if(!document.getElementById('tb-ar'))return;
  D.arreglos=(D.arreglos||[]).map(normalizarArreglo);
  poblarDatalistAr();poblarAnioArreglos();
  var lista=arreglosFiltradosAnio();
  lista=ordenar(lista,'ar','mes',1);
  if(!getSC('ar'))lista=lista.sort(function(a,b){return (a.mes-b.mes)||a.congregacion.localeCompare(b.congregacion);});
  var tb=document.getElementById('tb-ar');if(!tb)return;
  if(!lista.length){tb.innerHTML='<tr><td colspan="11"><div class="es"><div class="ic2">&#128197;</div><p>Sin arreglos registrados para este año.</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(a){var sel=_sel.ar.indexOf(a.id)>=0;return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('ar',a.id)+'</td>'
    +'<td><strong>'+nMes(a.mes)+'</strong></td><td>'+a.anio+'</td><td><strong>'+esc(a.congregacion)+'</strong></td><td>'+arEstadoBadge(a.estado)+'</td>'
    +'<td>'+esc(a.coordNombre||'---')+'</td><td>'+esc(a.coordTel||'---')+'</td><td>'+esc(a.coordEmail||'---')+'</td>'
    +'<td>'+(a.coordTel?'<button class="btn bg bsm" onclick="abrirWhatsAppCoord(\''+a.id+'\')">WhatsApp</button>':'---')+'</td><td>'+esc(a.obs||'')+'</td>'
    +'<td class="ac">'+btnAc('bg','editar','editArreglo',a.id)+btnAc('bd2','x','delArreglo',a.id)+'</td></tr>';}).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.ar.indexOf(c.dataset.id)>=0;});
}

function editArreglo(id){
  var a=D.arreglos.find(function(x){return x.id===id;});if(!a)return;normalizarArreglo(a);
  openM('Editar arreglo','<div class="fgrid">'
    +'<div class="fg"><label>Mes</label><select id="ear-m"><option value="1" '+(a.mes==1?'selected':'')+'>Enero</option><option value="2" '+(a.mes==2?'selected':'')+'>Febrero</option><option value="3" '+(a.mes==3?'selected':'')+'>Marzo</option><option value="4" '+(a.mes==4?'selected':'')+'>Abril</option><option value="5" '+(a.mes==5?'selected':'')+'>Mayo</option><option value="6" '+(a.mes==6?'selected':'')+'>Junio</option><option value="7" '+(a.mes==7?'selected':'')+'>Julio</option><option value="8" '+(a.mes==8?'selected':'')+'>Agosto</option><option value="9" '+(a.mes==9?'selected':'')+'>Septiembre</option><option value="10" '+(a.mes==10?'selected':'')+'>Octubre</option><option value="11" '+(a.mes==11?'selected':'')+'>Noviembre</option><option value="12" '+(a.mes==12?'selected':'')+'>Diciembre</option></select></div>'
    +'<div class="fg"><label>Año</label><input id="ear-a" type="number" value="'+a.anio+'"></div>'
    +'<div class="fg"><label>Congregación</label><input id="ear-c" value="'+esc(a.congregacion)+'"></div>'
    +'<div class="fg"><label>Estado</label><select id="ear-e"><option '+(a.estado==='Conversado'?'selected':'')+'>Conversado</option><option '+(a.estado==='Confirmado'?'selected':'')+'>Confirmado</option><option '+(a.estado==='Pendiente datos'?'selected':'')+'>Pendiente datos</option><option '+(a.estado==='Cancelado'?'selected':'')+'>Cancelado</option><option '+(a.estado==='Cerrado'?'selected':'')+'>Cerrado</option></select></div>'
    +'<div class="fg"><label>Dirección</label><input id="ear-d" value="'+esc(a.direccion||'')+'"></div>'
    +'<div class="fg"><label>Día</label><select id="ear-dia"><option value="0" '+(a.dia==='0'?'selected':'')+'>Domingo</option><option value="1" '+(a.dia==='1'?'selected':'')+'>Lunes</option><option value="2" '+(a.dia==='2'?'selected':'')+'>Martes</option><option value="3" '+(a.dia==='3'?'selected':'')+'>Miércoles</option><option value="4" '+(a.dia==='4'?'selected':'')+'>Jueves</option><option value="5" '+(a.dia==='5'?'selected':'')+'>Viernes</option><option value="6" '+(a.dia==='6'?'selected':'')+'>Sábado</option></select></div>'
    +'<div class="fg"><label>Horario</label><input id="ear-h" value="'+esc(a.horario||'')+'"></div>'
    +'<div class="fg"><label>Coordinador</label><input id="ear-cn" value="'+esc(a.coordNombre||'')+'"></div>'
    +'<div class="fg"><label>Teléfono</label><input id="ear-ct" value="'+esc(a.coordTel||'')+'"></div>'
    +'<div class="fg"><label>Correo</label><input id="ear-ce" value="'+esc(a.coordEmail||'')+'"></div>'
    +'<div class="fg"><label>Obs.</label><input id="ear-o" value="'+esc(a.obs||'')+'"></div></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:function(){
      a.mes=parseInt(document.getElementById('ear-m').value)||1;a.anio=parseInt(document.getElementById('ear-a').value)||new Date().getFullYear();a.congregacion=document.getElementById('ear-c').value.trim();a.estado=document.getElementById('ear-e').value;
      a.direccion=document.getElementById('ear-d').value.trim();a.dia=document.getElementById('ear-dia').value;a.horario=document.getElementById('ear-h').value.trim();a.coordNombre=document.getElementById('ear-cn').value.trim();a.coordTel=document.getElementById('ear-ct').value.trim();a.coordEmail=document.getElementById('ear-ce').value.trim();a.obs=document.getElementById('ear-o').value.trim();a.updatedAt=new Date().toISOString();
      normalizarArreglo(a);upsertCongDesdeArreglo(a);dbSaveArray('arreglos');poblarSelCE();poblarSelCMCong();renderArreglos();aplicarArregloAConfig();closeM();toast('Arreglo actualizado','s');
    }}]);
}

function delArreglo(id){confirmar('Eliminar este arreglo?',function(){D.arreglos=D.arreglos.filter(function(a){return a.id!==id;});dbSaveArray('arreglos');renderArreglos();aplicarArregloAConfig();toast('Arreglo eliminado','s');});}

function arregloParaConfig(mes,anio){
  var arr=(D.arreglos||[]).filter(function(a){return parseInt(a.mes)===parseInt(mes)&&parseInt(a.anio)===parseInt(anio)&&a.estado!=='Cancelado';});
  arr=arr.sort(function(a,b){var pa=a.estado==='Confirmado'?0:a.estado==='Conversado'?1:a.estado==='Pendiente datos'?2:3;var pb=b.estado==='Confirmado'?0:b.estado==='Conversado'?1:b.estado==='Pendiente datos'?2:3;return pa-pb||a.congregacion.localeCompare(b.congregacion);});
  return arr;
}

function aplicarArregloAConfig(silencioso){
  var m=parseInt((document.getElementById('cfg-m')||{}).value)||D.config.mes;
  var a=parseInt((document.getElementById('cfg-a')||{}).value)||D.config.anio;
  var arr=arregloParaConfig(m,a);
  if(!arr.length)return false;
  var ar=arr[0];upsertCongDesdeArreglo(ar);poblarSelCE();
  var sel=document.getElementById('cfg-ce');if(sel)sel.value=ar.congregacion;
  D.config.congregacionExternaMes=ar.congregacion;
  if(!silencioso){toast('Arreglo cargado para '+nMes(m)+' '+a+(arr.length>1?' (hay mas de un arreglo)':''),'s');}
  return true;
}

function setupArregloConfigAuto(){
  ['cfg-m','cfg-a'].forEach(function(id){var el=document.getElementById(id);if(el&&!el._arAuto){el._arAuto=true;el.addEventListener('change',function(){aplicarArregloAConfig(false);});}});
}

function exportarArreglosCSV(){
  var lista=arreglosFiltradosAnio().sort(function(a,b){return (a.mes-b.mes)||a.congregacion.localeCompare(b.congregacion);});
  var cols=['Mes','Año','Congregación','Estado','Dirección','Día','Horario','Coordinador','Teléfono','Correo','Obs.'];
  var filas=lista.map(function(a){return [nMes(a.mes),a.anio,a.congregacion,a.estado,a.direccion,nomDia(a.dia),a.horario,a.coordNombre,a.coordTel,a.coordEmail,a.obs].map(function(v){return '"'+(v||'').toString().replace(/"/g,'""')+'"';}).join(';');});
  var b=new Blob(['\uFEFF'+[cols.join(';')].concat(filas).join('\r\n')],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='arreglos_conferencias_'+((document.getElementById('ar-y')||{}).value||D.config.anio)+'.csv';a.click();toast('CSV exportado','s');
}

function poblarSelCMCong(){
  ['cm-c','cm-pc'].forEach(function(sid){
    var sel=document.getElementById(sid);if(!sel)return;var v=sel.value;
    sel.innerHTML='<option value="">-- Seleccionar --</option>'+D.congregaciones.map(function(c){return '<option value="'+esc(c.nombre)+'">'+esc(c.nombre)+'</option>';}).join('');
    if(v)sel.value=v;
  });
}

function autoTitCM(){var n=parseInt(document.getElementById('cm-n').value);var d=discursoCat(n);document.getElementById('cm-t').value=(d&&d.estado!=='Inactivo')?d.titulo:'';}

function agregarCM(){
  var cong=document.getElementById('cm-c').value;var h=document.getElementById('cm-h').value.trim();var num=parseInt(document.getElementById('cm-n').value);
  if(!cong||!h||!num){toast('Congregacion, hermano y N obligatorios','e');return;}
  var d=D.discursos.find(function(x){return x.numero===num;});
  D.cargaMensual.push({id:uid(),congregacion:cong,hermano:h,numDiscurso:num,titulo:document.getElementById('cm-t').value.trim()||(d?d.titulo:''),telefono:document.getElementById('cm-tel').value.trim(),obs:document.getElementById('cm-o').value.trim()});
  dbSaveArray('cargaMensual');renderCM();toast('Agregado','s');
  ['cm-h','cm-n','cm-t','cm-tel','cm-o'].forEach(function(i){document.getElementById(i).value='';});
}

function importarCMMasivo(){
  var congDefault=document.getElementById('cm-pc').value;
  var txt=document.getElementById('cm-paste').value.trim();var ok=0,sk=0;
  if(!txt){toast('Pega al menos una linea','w');return;}
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l),cong='',h='',num='',tel='',obs='';
    /* Formato con congregacion por linea: Congregacion | Hermano | N | Tel | Obs */
    if(!congDefault || (p.length>=4 && isNaN(parseInt(p[1])))){
      cong=(p[0]||'').trim();h=(p[1]||'').trim();num=parseInt(p[2]);tel=(p[3]||'').trim();obs=(p[4]||'').trim();
    }else{
      cong=congDefault;h=(p[0]||'').trim();num=parseInt(p[1]);tel=(p[2]||'').trim();obs=(p[3]||'').trim();
    }
    if(!cong||!h||!num){sk++;return;}
    var ya=D.cargaMensual.find(function(x){return x.congregacion===cong&&x.hermano.toLowerCase()===h.toLowerCase()&&x.numDiscurso===num;});
    if(ya){sk++;return;}
    var d=D.discursos.find(function(x){return x.numero===num;});
    D.cargaMensual.push({id:uid(),congregacion:cong,hermano:h,numDiscurso:num,titulo:d?d.titulo:'',telefono:tel,obs:obs});ok++;
  });
  dbSaveArray('cargaMensual');renderCM();document.getElementById('cm-paste').value='';toast(ok+' importados'+(sk?', '+sk+' omitidos':''),'s');
}

function limpiarCM(){confirmar('Limpiar toda la carga mensual?',function(){D.cargaMensual=[];dbSaveArray('cargaMensual');renderCM();toast('Limpiada','s');});}

function renderCM(){
  if(!document.getElementById('tb-cm'))return;
  var q=document.getElementById('bq-cm').value.toLowerCase();
  var lista=D.cargaMensual.filter(function(cm){return !q||cm.congregacion.toLowerCase().includes(q)||cm.hermano.toLowerCase().includes(q)||cm.numDiscurso.toString().includes(q);});
  lista=ordenar(lista,'cm','hermano',1);
  var tb=document.getElementById('tb-cm');
  if(!lista.length){tb.innerHTML='<tr><td colspan="9"><div class="es"><div class="ic2">&#128229;</div><p>Sin carga mensual</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(cm){
    var cat=discursoCat(cm.numDiscurso),ec=!!cat,act=esDiscursoActivo(cm.numDiscurso),sel=_sel.cm.indexOf(cm.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('cm',cm.id)+'</td>'
      +'<td>'+esc(cm.congregacion)+'</td><td>'+esc(cm.hermano)+'</td><td>'+esc(cm.telefono||'---')+'</td>'
      +'<td><strong>'+cm.numDiscurso+'</strong></td><td>'+esc((act?cm.titulo:'')||'---')+'</td>'
      +'<td>'+(ec?(act?'<span class="badge bgn">Activo</span>':'<span class="badge brd">Inactivo</span>'):'<span class="badge bye">No</span>')+'</td>'
      +'<td>'+esc(cm.obs||'---')+'</td>'
      +'<td class="ac">'+btnAc('bd2','x','delCM',cm.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.cm.indexOf(c.dataset.id)>=0;});
}

function delCM(id){D.cargaMensual=D.cargaMensual.filter(function(c){return c.id!==id;});dbSaveArray('cargaMensual');renderCM();}

function ultimaVez(num){
  if(esDiscursoInactivo(num))return null;
  var n=parseInt(num),ref=refMes().slice(0,10);
  var ents=D.historial.filter(function(h){
    return parseInt(h.numDiscurso)===n&&h.fecha&&h.fecha<ref&&h.tipo!=='Superintendente de Circuito';
  });
  if(!ents.length)return null;
  return ents.sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);})[0].fecha;
}

function calcRec(num){
  if(esDiscursoInactivo(num))return{ultima:'Inactivo',dias:0,estado:'Bloqueado',rec:'No usar'};
  var db=D.config.diasBloqueo||365,u=ultimaVez(num);
  if(!u)return{ultima:'Nunca',dias:Infinity,estado:'Disponible',rec:'Muy recomendado'};
  var dias=diasDesde(u,refMes());
  return{ultima:u,dias:dias,estado:dias>=db?'Disponible':'Bloqueado',rec:dias>=730?'Recomendado alto':dias>=db?'Recomendado':'No usar'};
}

function telefonoOrador(cong,hermano,num,tipo){
  var nh=normName(hermano),nc=normName(cong),n=parseInt(num);
  if(tipo==='Superintendente de Circuito'||nc===normName('Superintendente de Circuito'))return D.config.scTel||'';
  var loc=D.locales.find(function(h){return normName(h.nombre)===nh;});
  if((tipo==='Local'||(D.miCongr&&normName(cong)===normName(D.miCongr.nombre)))&&loc)return loc.telefono||'';
  var cms=(D.cargaMensual||[]).filter(function(cm){return normName(cm.hermano)===nh;});
  var exact=cms.find(function(cm){return normName(cm.congregacion)===nc&&parseInt(cm.numDiscurso)===n&&cm.telefono;});if(exact)return exact.telefono;
  var byCong=cms.find(function(cm){return normName(cm.congregacion)===nc&&cm.telefono;});if(byCong)return byCong.telefono;
  var byNum=cms.find(function(cm){return parseInt(cm.numDiscurso)===n&&cm.telefono;});if(byNum)return byNum.telefono;
  var any=cms.find(function(cm){return cm.telefono;});if(any)return any.telefono;
  return loc&&loc.telefono?loc.telefono:'';
}

function contactoOradorHist(h){
  if(!h)return '';
  if(h.tipo==='Superintendente de Circuito'||h.congregacion==='Superintendente de Circuito'){
    var parts=[];if(D.config.scTel)parts.push(D.config.scTel);if(D.config.scEmail)parts.push(D.config.scEmail);return parts.join(' | ');
  }
  return h.telefono||telefonoOrador(h.congregacion,h.hermano,h.numDiscurso,h.tipo)||'';
}

function telefonoParaHist(h){return contactoOradorHist(h);}

function telefonoParaPlan(p){return telefonoOrador(p.congregacion,p.hermano,p.numDiscurso,esSC(p)?'Superintendente de Circuito':(p._origen==='Local'?'Local':'Externo'));}

function autoTitHist(){var d=discursoCat(parseInt(document.getElementById('hi-n').value));document.getElementById('hi-t').value=(d&&d.estado!=='Inactivo')?d.titulo:'';}

function agregarHist(){
  var f=document.getElementById('hi-f').value,num=parseInt(document.getElementById('hi-n').value),h=document.getElementById('hi-h').value.trim();
  if(!f||!num||!h){toast('Fecha, N y hermano obligatorios','e');return;}
  var tel=document.getElementById('hi-tel')?document.getElementById('hi-tel').value.trim():'';
  var tipo=document.getElementById('hi-tp').value,cong=document.getElementById('hi-c').value.trim();
  D.historial.push({id:uid(),fecha:f,tipo:tipo,congregacion:cong,hermano:h,telefono:tel,numDiscurso:num,titulo:document.getElementById('hi-t').value.trim(),obs:document.getElementById('hi-o').value.trim()});
  dbSaveArray('historial');renderHist();poblarFiltAnio();toast('Agregado','s');
  ['hi-f','hi-c','hi-h','hi-tel','hi-n','hi-t','hi-o'].forEach(function(i){var el=document.getElementById(i);if(el)el.value='';});
}

function poblarFiltAnio(){
  var sel=document.getElementById('fhi-a');if(!sel)return;var v=sel.value;
  var anios=[...new Set(D.historial.map(function(h){return h.fecha?h.fecha.slice(0,4):null;}).filter(Boolean))].sort(function(a,b){return b-a;});
  sel.innerHTML='<option value="">Todos los anos</option>'+anios.map(function(a){return '<option value="'+a+'">'+a+'</option>';}).join('');
  if(v)sel.value=v;
}


function renderReporteHistorial(){
  // Años disponibles
  var anios={};
  (D.historial||[]).forEach(function(h){
    if(h.fecha){var a=parseInt(h.fecha.slice(0,4));if(a>2000)anios[a]=true;}
  });
  var cols=Object.keys(anios).map(Number).sort(function(a,b){return a-b;});
  // Discursos activos
  var discs=D.discursos.filter(function(d){return d.estado==='Activo';})
    .sort(function(a,b){return parseInt(a.numero)-parseInt(b.numero);});
  // Mapa numero -> año -> ultima fecha
  var mapa={};
  discs.forEach(function(d){mapa[String(d.numero)]={};});
  (D.historial||[]).forEach(function(h){
    if(!h.fecha||!h.numDiscurso)return;
    var num=String(parseInt(h.numDiscurso));
    var anio=parseInt(h.fecha.slice(0,4));
    if(!mapa[num])return;
    if(!mapa[num][anio]||h.fecha>mapa[num][anio])mapa[num][anio]=h.fecha;
  });
  return {cols:cols,discs:discs,mapa:mapa};
}

function exportarReporteHistorialCSV(){
  var d=renderReporteHistorial();
  if(!d.cols.length){toast('Sin datos en el historial','e');return;}
  var rows=[['N°','Titulo'].concat(d.cols.map(String))];
  d.discs.forEach(function(disc){
    var num=String(disc.numero);
    var row=[disc.numero,disc.titulo];
    d.cols.forEach(function(a){
      var f=d.mapa[num]&&d.mapa[num][a]?d.mapa[num][a]:'';
      row.push(f?fmtF(f):'');
    });
    rows.push(row);
  });
  var csv=rows.map(function(r){
    return r.map(function(v){
      var s=String(v||'');
      return s.indexOf(',')>=0||s.indexOf('"')>=0?'"'+s.replace(/"/g,'""')+'"':s;
    }).join(',');
  }).join('\r\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='reporte_discursos_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  toast('CSV exportado','s');
}

function exportarReporteHistorialPDF(){
  var d=renderReporteHistorial();
  if(!d.cols.length){toast('Sin datos en el historial','e');return;}
  var html='<html><head><meta charset="utf-8"><title>Reporte Discursos</title>'
    +'<style>body{font-family:Arial,sans-serif;font-size:10px;margin:20px}'
    +'table{border-collapse:collapse;width:100%}'
    +'th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}'
    +'th{background:#f0f0f0;font-weight:bold}'
    +'tr:nth-child(even){background:#f9f9f9}'
    +'h2{font-size:14px;margin-bottom:8px}'
    +'</style></head><body>'
    +'<h2>Reporte de discursos por año — '+esc(D.miCongr.nombre||'')+'</h2>'
    +'<table><thead><tr><th>N°</th><th>Titulo</th>';
  d.cols.forEach(function(a){html+='<th>'+a+'</th>';});
  html+='</tr></thead><tbody>';
  d.discs.forEach(function(disc){
    var num=String(disc.numero);
    html+='<tr><td>'+disc.numero+'</td><td>'+esc(disc.titulo)+'</td>';
    d.cols.forEach(function(a){
      var f=d.mapa[num]&&d.mapa[num][a]?fmtF(d.mapa[num][a]):'';
      html+='<td>'+(f||'---')+'</td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table></body></html>';
  var w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function(){w.print();},500);
}

function renderHist(){
  if(!document.getElementById('tb-hi'))return;
  var q=document.getElementById('bq-hi').value.toLowerCase();var anio=document.getElementById('fhi-a').value;
  var lista=D.historial.filter(function(h){return(!q||h.numDiscurso.toString().includes(q)||h.hermano.toLowerCase().includes(q)||(h.congregacion||'').toLowerCase().includes(q)||(h.titulo||'').toLowerCase().includes(q))&&(!anio||(h.fecha||'').startsWith(anio));});
  var c=getSC('hi');
  if(c)lista=ordenar(lista,'hi',c,1);else lista=lista.slice().sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});
  var tb=document.getElementById('tb-hi');
  if(!lista.length){tb.innerHTML='<tr><td colspan="10"><div class="es"><div class="ic2">&#128220;</div><p>Sin historial</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(h){
    var sel=_sel.hi.indexOf(h.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('hi',h.id)+'</td>'
      +'<td>'+esc(h.fecha||'---')+'</td>'
      +'<td><span class="badge '+(h.tipo==='Local'?'bpr':h.tipo==='Superintendente de Circuito'?'bbl':'bgn')+'">'+esc(h.tipo||'')+'</span></td>'
      +'<td>'+esc(h.congregacion||'---')+'</td><td>'+esc(h.hermano)+'</td><td>'+esc(h.telefono||telefonoParaHist(h)||'---')+'</td>'
      +'<td><strong>'+(h.numDiscurso||'---')+'</strong></td><td>'+esc(h.titulo||'---')+'</td><td>'+esc(h.obs||'---')+'</td>'
      +'<td class="ac">'+btnAc('bd2','x','delHist',h.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.hi.indexOf(c.dataset.id)>=0;});
}

function delHist(id){confirmar('Eliminar este registro?',function(){D.historial=D.historial.filter(function(h){return h.id!==id;});dbSaveArray('historial');renderHist();poblarFiltAnio();toast('Eliminado','s');});}

function importarHistMasivo(){
  var txt=document.getElementById('iat-hi').value.trim();var ok=0,sk=0;
  if(!txt){toast('Pega datos para importar','w');return;}
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var f=normFecha(p[0]||'');var tipo=(p[1]||'Externo').trim();var cong=(p[2]||'').trim();var hermano=(p[3]||'').trim();
    var tel='',num='',tit='',obs='';
    if(!isNaN(parseInt(p[4]))){num=parseInt(p[4]);tit=(p[5]||'').trim();obs=(p[6]||'').trim();}
    else{tel=(p[4]||'').trim();num=parseInt(p[5]);tit=(p[6]||'').trim();obs=(p[7]||'').trim();}
    if(!f||!hermano||!num){sk++;return;}
    if(tipo.toLowerCase().indexOf('super')>=0)tipo='Superintendente de Circuito';
    else if(tipo.toLowerCase().indexOf('local')>=0)tipo='Local';else tipo='Externo';
    if(!tel)tel=telefonoOrador(cong,hermano,num,tipo);
    if(!tit){var d=D.discursos.find(function(x){return x.numero===num;});tit=d?d.titulo:'';}
    var ya=D.historial.find(function(h){return h.fecha===f&&h.numDiscurso==num&&h.hermano.toLowerCase()===hermano.toLowerCase();});
    if(ya){sk++;return;}
    D.historial.push({id:uid(),fecha:f,tipo:tipo,congregacion:cong,hermano:hermano,telefono:tel,numDiscurso:num,titulo:tit,obs:obs});ok++;
  });
  dbSaveArray('historial');renderHist();poblarFiltAnio();document.getElementById('iat-hi').value='';toggleArea('ia-hi');toast(ok+' importados'+(sk?', '+sk+' omitidos':''),'s');
}

function autoTitSX(){var d=discursoCat(parseInt(document.getElementById('sx-n').value));document.getElementById('sx-t').value=(d&&d.estado!=='Inactivo')?d.titulo:'';}

function agregarSalidaHist(){
  var f=document.getElementById('sx-f').value,num=parseInt(document.getElementById('sx-n').value),h=document.getElementById('sx-h').value.trim();
  if(!f||!num||!h){toast('Fecha, N y hermano obligatorios','e');return;}
  D.salidasRealizadas.push({id:uid(),fecha:f,congregacion:document.getElementById('sx-c').value.trim(),hermano:h,numDiscurso:num,titulo:document.getElementById('sx-t').value.trim(),obs:document.getElementById('sx-o').value.trim()});
  dbSaveArray('salidasRealizadas');renderSalidas();poblarFiltAnioSal();toast('Salida agregada','s');
  ['sx-f','sx-c','sx-h','sx-n','sx-t','sx-o'].forEach(function(i){document.getElementById(i).value='';});
}

function importarSalidasMasivo(){
  var txt=document.getElementById('iat-sx').value.trim();var ok=0,sk=0;
  if(!txt){toast('Pega datos para importar','w');return;}
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){
    var p=sep(l);var f=normFecha(p[0]||'');var cong=(p[1]||'').trim();var hermano=(p[2]||'').trim();var num=parseInt(p[3]);var tit=(p[4]||'').trim();var obs=(p[5]||'').trim();
    if(!f||!hermano||!num){sk++;return;}
    if(!tit){var d=D.discursos.find(function(x){return x.numero===num;});tit=d?d.titulo:'';}
    var ya=D.salidasRealizadas.find(function(s){return s.fecha===f&&s.numDiscurso==num&&(s.hermano||'').toLowerCase()===hermano.toLowerCase()&&(s.congregacion||'').toLowerCase()===cong.toLowerCase();});
    if(ya){sk++;return;}
    D.salidasRealizadas.push({id:uid(),fecha:f,congregacion:cong,hermano:hermano,numDiscurso:num,titulo:tit,obs:obs});ok++;
  });
  dbSaveArray('salidasRealizadas');renderSalidas();poblarFiltAnioSal();document.getElementById('iat-sx').value='';toggleArea('ia-sx');toast(ok+' salidas importadas'+(sk?', '+sk+' omitidas':''),'s');
}

function poblarFiltAnioSal(){
  var sel=document.getElementById('fsx-a');if(!sel)return;var v=sel.value;
  var anios=[...new Set(D.salidasRealizadas.map(function(h){return h.fecha?h.fecha.slice(0,4):null;}).filter(Boolean))].sort(function(a,b){return b-a;});
  sel.innerHTML='<option value="">Todos los anos</option>'+anios.map(function(a){return '<option value="'+a+'">'+a+'</option>';}).join('');
  if(v)sel.value=v;
}

function renderSalidas(){
  if(!document.getElementById('tb-sx'))return;
  var q=(document.getElementById('bq-sx')?document.getElementById('bq-sx').value.toLowerCase():'');var anio=(document.getElementById('fsx-a')?document.getElementById('fsx-a').value:'');
  var lista=D.salidasRealizadas.filter(function(s){return(!q||(s.numDiscurso||'').toString().includes(q)||(s.hermano||'').toLowerCase().includes(q)||(s.congregacion||'').toLowerCase().includes(q)||(s.titulo||'').toLowerCase().includes(q))&&(!anio||(s.fecha||'').startsWith(anio));});
  var c=getSC('sx');
  if(c)lista=ordenar(lista,'sx',c,1);else lista=lista.slice().sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});
  var tb=document.getElementById('tb-sx');if(!tb)return;
  if(!lista.length){tb.innerHTML='<tr><td colspan="8"><div class="es"><div class="ic2">&#128663;</div><p>Sin salidas realizadas</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(function(s){
    var sel=_sel.sx.indexOf(s.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('sx',s.id)+'</td>'
      +'<td>'+esc(s.fecha||'---')+'</td><td>'+esc(s.congregacion||'---')+'</td><td>'+esc(s.hermano||'---')+'</td>'
      +'<td><strong>'+esc(s.numDiscurso||'')+'</strong></td><td>'+esc(s.titulo||'---')+'</td><td>'+esc(s.obs||'---')+'</td>'
      +'<td class="ac">'+btnAc('bd2','x','delSalidaHist',s.id)+'</td></tr>';
  }).join('');
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.sx.indexOf(c.dataset.id)>=0;});
}

function delSalidaHist(id){confirmar('Eliminar esta salida?',function(){D.salidasRealizadas=D.salidasRealizadas.filter(function(s){return s.id!==id;});dbSaveArray('salidasRealizadas');renderSalidas();poblarFiltAnioSal();toast('Eliminada','s');});}

function pasarPlanAHistoriales(lista){
  var res={internos:0,salidas:0};
  lista.forEach(function(p){
    if(!p.fecha||!p.hermano)return;
    if(p.tipo==='Salida'||p.tipo==='Local'){
      var numS=parseInt(p.numDiscurso);if(!numS||!esDiscursoActivo(numS))return;
      var yaS=D.salidasRealizadas.find(function(s){return s.fecha===p.fecha&&s.numDiscurso==numS&&s.hermano===p.hermano&&s.congregacion===p.congregacion;});
      if(!yaS){
        var newS={id:uid(),fecha:p.fecha,congregacion:p.congregacion,hermano:p.hermano,hermanoId:p._hermanoId||'',telefono:p.telefono||telefonoParaPlan(p),numDiscurso:numS,titulo:p.titulo,obs:p.obs||''};
        D.salidasRealizadas.push(newS);
        dbUpsertItem('salidasRealizadas',newS);
        res.salidas++;
      }
    }else if(esSC(p)){
      var numSC=parseInt(p.numDiscurso)||'';
      var yaSC=D.historial.find(function(h){return h.fecha===p.fecha&&h.tipo==='Superintendente de Circuito'&&h.hermano===p.hermano&&h.titulo===p.titulo;});
      if(!yaSC){
        var newSC={id:uid(),fecha:p.fecha,tipo:'Superintendente de Circuito',congregacion:'Superintendente de Circuito',hermano:p.hermano,telefono:D.config.scTel||p.telefono||'',numDiscurso:numSC,titulo:p.titulo,obs:p.obs||''};
        D.historial.push(newSC);
        dbUpsertItem('historial',newSC);
        res.internos++;
      }
    }else{
      var num=parseInt(p.numDiscurso);if(!num||!esDiscursoActivo(num))return;
      var tipo=p._origen==='Local'?'Local':'Externo';
      var ya=D.historial.find(function(h){return h.fecha===p.fecha&&h.numDiscurso==num&&h.hermano===p.hermano;});
      if(!ya){
        var newH={id:uid(),fecha:p.fecha,tipo:tipo,congregacion:p.congregacion,hermano:p.hermano,telefono:p.telefono||telefonoParaPlan(p),numDiscurso:num,titulo:p.titulo,obs:p.obs||''};
        D.historial.push(newH);
        dbUpsertItem('historial',newH);
        res.internos++;
      }
    }
  });
  return res;
}

function esSC(p){return p&&p._origen==='SC';}

function haySCPlan(){return D.config&&D.config.habraSCMes==='si';}

function haySalidasPlan(){return D.config&&D.config.habraSalidasMes==='si';}

function guardarPlanOpciones(){
  var el=document.getElementById('pl-salidas');
  if(el)D.config.habraSalidasMes=el.value;
  var sc=document.getElementById('pl-sc');
  if(sc){
    if(sc.value==='si' && !(D.config.scNombre||'').trim()){
      D.config.habraSCMes='no';sc.value='no';toast('Primero registra el nombre del Superintendente de Circuito en Configuracion','e');
    }else D.config.habraSCMes=sc.value;
  }
  dbSaveDoc('config');renderPlan();
  toast('Opciones del mes actualizadas','s');
}

function normConf(v){return(!v||v==='Pendiente'||v==='Por confirmar')?'Por confirmar':v;}

function esConfirmado(p){return normConf(p&&p.confirmado)==='Si';}

function uniq(arr){var o={},r=[];arr.forEach(function(v){v=(v||'').trim();if(v&&!o[v.toLowerCase()]){o[v.toLowerCase()]=true;r.push(v);}});return r;}

function congsCarga(){return uniq(D.cargaMensual.filter(function(c){return esDiscursoActivo(c.numDiscurso);}).map(function(c){return c.congregacion;})).sort(function(a,b){return a.localeCompare(b);});}

function congsDestino(){return D.congregaciones.filter(function(c){return c.estado==='Activa';}).map(function(c){return c.nombre;}).sort(function(a,b){return a.localeCompare(b);});}

function optionList(vals,sel,ph){
  var html='<option value="">'+(ph||'-- Seleccionar --')+'</option>';
  vals.forEach(function(v){html+='<option value="'+esc(v)+'" '+(sel===v?'selected':'')+'>'+esc(v)+'</option>';});
  if(sel&&vals.indexOf(sel)<0)html+='<option value="'+esc(sel)+'" selected>'+esc(sel)+'</option>';
  return html;
}

function fechaSugeridaDestino(cong,actualId){
  var c=D.config,ce=D.congregaciones.find(function(x){return x.nombre===cong;});
  if(!ce||ce.dia===undefined||ce.dia==='')return '';
  var fechas=fechasMes(c.mes,c.anio,ce.dia);
  var usadas=D.planificacion.filter(function(p){return p.id!==actualId&&(p.tipo==='Salida'||p.tipo==='Local')&&p.congregacion===cong&&p.fecha;}).map(function(p){return p.fecha;});
  for(var i=0;i<fechas.length;i++){if(usadas.indexOf(fechas[i])<0)return fechas[i];}
  return fechas[0]||'';
}

function generarPlan(){
  var c=D.config,mc=D.miCongr;
  if(!mc.dia&&mc.dia!=='0'){toast('Configura el dia de reunion en Mi Congregacion','w');return;}
  if(!c.mes||!c.anio){toast('Configura mes y ano','w');return;}

  var tieneData=D.planificacion.length>0;
  if(tieneData){
    var compMes=D.planificacion.filter(function(p){return p.fecha&&p.numDiscurso&&p.hermano;});
    openM('Ya existe planificacion',
      '<p style="font-size:14px;margin-bottom:12px">Hay '+D.planificacion.length+' fila(s) en la planificacion actual.</p>'
      +(compMes.length?'<p style="font-size:13px;color:var(--tx2);margin-bottom:8px">'+compMes.length+' fila(s) completas se pueden cerrar al historial correspondiente.</p>':'')
      +'<p style="font-size:13px;color:var(--ye)">&#9888; Al generar se limpiara la planificacion actual.</p>',
      [
        {l:'Cancelar',c:'bg',fn:closeM},
        {l:'Generar sin cerrar mes',c:'bw',fn:function(){closeM();_doGenerar();}},
        {l:'Cerrar mes y generar',c:'bp',fn:function(){closeM();_pasarYGenerar();}}
      ]);
  }else{
    _doGenerar();
  }
}

function _pasarYGenerar(){
  var comp=D.planificacion.filter(function(p){return filaCompletaCierre(p);});
  var r=pasarPlanAHistoriales(comp);
  toast(r.internos+' al historial interno, '+r.salidas+' a salidas realizadas','s');
  _doGenerar();
}

function _doGenerar(){
  var c=D.config,mc=D.miCongr;
  var fExt=fechasMes(c.mes,c.anio,mc.dia);
  D.planificacion=[];
  // Filas para oradores que vienen
  fExt.forEach(function(f){
    D.planificacion.push({id:uid(),tipo:'Externo',_origen:'Externo',_hermanoId:'',fecha:f,congregacion:'',hermano:'',numDiscurso:'',titulo:'',confirmado:'Por confirmar',obs:''});
  });
  // Si hay salidas activas y congregacion externa configurada, generar fechas de salida
  if(haySalidasPlan()&&c.congregacionExternaMes){
    var ce=D.congregaciones.find(function(x){return x.nombre===c.congregacionExternaMes;});
    if(ce&&ce.dia!==undefined&&ce.dia!==''){
      var fSal=fechasMes(c.mes,c.anio,ce.dia);
      fSal.forEach(function(f){
        D.planificacion.push({id:uid(),tipo:'Salida',_origen:'Local',_hermanoId:'',fecha:f,congregacion:c.congregacionExternaMes,hermano:'',numDiscurso:'',titulo:'',confirmado:'Por confirmar',obs:''});
      });
      toast('Generadas '+fExt.length+' fechas de entrada y '+fSal.length+' fechas de salida','s');
    }else{
      toast('Generadas '+fExt.length+' fechas. Configura el dia de reunion de la congregacion externa para generar salidas automaticamente.','w');
    }
  }else{
    toast('Generadas '+fExt.length+' fechas para discursos en nuestra congregacion','s');
  }
  dbSaveArray('planificacion');renderPlan();
}

function renderPlan(){
  if(!document.getElementById('tb-pe'))return;
  sincronizarDiscursosInactivos(false);
  var sel=document.getElementById('pl-salidas');if(sel)sel.value=D.config.habraSalidasMes||'no';
  var scsel=document.getElementById('pl-sc');if(scsel)scsel.value=D.config.habraSCMes||'no';
  var card=document.getElementById('card-salidas-plan');if(card)card.style.display=haySalidasPlan()?'block':'none';
  var ext=D.planificacion.filter(function(p){return p.tipo==='Externo';});
  var sal=D.planificacion.filter(function(p){return p.tipo==='Salida'||p.tipo==='Local';});
  renderPlanExt(ext);
  if(haySalidasPlan()){renderSugSalidas();renderPlanSal(sal);}
  valPlan();
}

function renderPlanExt(lista){
  var tb=document.getElementById('tb-pe');
  if(!lista.length){tb.innerHTML='<tr><td colspan="11" style="text-align:center;color:var(--tx3);padding:20px">Sin oradores. Genera las fechas del mes o usa + Agregar.</td></tr>';return;}
  var congs=congsCarga();
  var hermLoc=D.locales.filter(function(h){return h.estado==='Activo'&&h.puedeLocal==='si';}).sort(function(a,b){return a.nombre.localeCompare(b.nombre);});
  var html='';
  lista.forEach(function(p){
    var pid=p.id,sel=_sel.pe.indexOf(pid)>=0;
    var info=(p.numDiscurso&&!esSC(p))?calcRec(parseInt(p.numDiscurso)):null;
    var eB='bgr',eT='---';
    if(esSC(p)){eB='bbl';eT='Especial';}
    else if(info&&p.numDiscurso){eB=info.estado==='Disponible'?'bgn':'brd';eT=info.estado==='Disponible'?'OK':'Bloq.';}
    var scOpt=(haySCPlan()||esSC(p))?'<option value="SC" '+(esSC(p)?'selected':'')+'>Superintendente</option>':'';
    var selOr='<select class="pi" data-id="'+pid+'" onchange="pOrig(this)" style="width:132px">'
      +'<option value="Externo" '+(p._origen!=='Local'&&!esSC(p)?'selected':'')+'>Externo</option>'
      +'<option value="Local" '+(p._origen==='Local'?'selected':'')+'>Local</option>'
      +scOpt+'</select>';
    var celCong,selH,selD,tituloCel;
    if(esSC(p)){
      if(D.config.scNombre)p.hermano=D.config.scNombre;
      p.congregacion='Superintendente de Circuito';
      celCong='<input type="text" class="pi" value="Superintendente de Circuito" disabled style="min-width:160px">';
      selH='<input type="text" class="pi" value="'+esc(p.hermano||D.config.scNombre||'')+'" disabled style="min-width:150px">';
      selD='<input class="pi" type="number" style="width:74px" value="'+esc(p.numDiscurso||'')+'" data-id="'+pid+'" data-f="numDiscurso" onchange="pFld(this)" placeholder="Opc.">';
      tituloCel='<input type="text" class="pi" value="'+esc(p.titulo||'')+'" data-id="'+pid+'" data-f="titulo" onchange="pFld(this)" placeholder="Tema obligatorio" style="min-width:210px">';
    }else if(p._origen==='Local'){
      celCong='<input type="text" class="pi" value="'+esc(D.miCongr.nombre||'Mi Congregacion')+'" disabled style="min-width:120px">';
      selH='<select class="pi" data-id="'+pid+'" onchange="pEH(this)" style="min-width:125px"><option value="">-- Hermano --</option>'+hermLoc.map(function(h){return '<option value="L:'+h.id+'" '+(p._hermanoId===h.id?'selected':'')+'>'+esc(h.nombre)+'</option>';}).join('')+'</select>';
      if(p._hermanoId){var rl=D.repertorioLocal.filter(function(r){return r.hermanoId===p._hermanoId&&r.puedeLocal==='si'&&r.estado==='Activo'&&esDiscursoActivo(r.numDiscurso);}).sort(function(a,b){return a.numDiscurso-b.numDiscurso;});selD='<select class="pi" data-id="'+pid+'" onchange="pED(this)" style="width:64px"><option value="">--</option>'+rl.map(function(r){return '<option value="'+r.numDiscurso+'" '+(p.numDiscurso==r.numDiscurso?'selected':'')+'>'+r.numDiscurso+'</option>';}).join('')+'</select>';}
      else selD='<input class="pi" type="number" style="width:64px" disabled placeholder="--">';
      tituloCel=esc(p.titulo||'---');
    }else{
      celCong='<select class="pi" data-id="'+pid+'" onchange="pCongExt(this)" style="min-width:130px">'+optionList(congs,p.congregacion,'-- Congregacion --')+'</select>';
      var hermanos=p.congregacion?uniq(D.cargaMensual.filter(function(cm){return cm.congregacion===p.congregacion&&esDiscursoActivo(cm.numDiscurso);}).map(function(cm){return cm.hermano;})).sort(function(a,b){return a.localeCompare(b);}):[];
      selH='<select class="pi" data-id="'+pid+'" onchange="pEH(this)" style="min-width:125px" '+(!p.congregacion?'disabled':'')+'><option value="">-- Hermano --</option>'+hermanos.map(function(h){return '<option value="E:'+esc(h)+'" '+(p.hermano===h?'selected':'')+'>'+esc(h)+'</option>';}).join('')+'</select>';
      if(p.hermano){var cms=D.cargaMensual.filter(function(cm){return cm.congregacion===p.congregacion&&cm.hermano===p.hermano&&esDiscursoActivo(cm.numDiscurso);}).sort(function(a,b){return a.numDiscurso-b.numDiscurso;});selD='<select class="pi" data-id="'+pid+'" onchange="pED(this)" style="width:64px"><option value="">--</option>'+cms.map(function(cm){return '<option value="'+cm.numDiscurso+'" '+(p.numDiscurso==cm.numDiscurso?'selected':'')+'>'+cm.numDiscurso+'</option>';}).join('')+'</select>';}
      else selD='<input class="pi" type="number" style="width:64px" disabled placeholder="--">';
      tituloCel=esc(p.titulo||'---');
    }
    html+='<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('pe',pid)+'</td>'
      +'<td>'+selOr+'</td>'
      +'<td><input type="date" class="pi" value="'+esc(p.fecha||'')+'" data-id="'+pid+'" data-f="fecha" onchange="pFld(this)"></td>'
      +'<td>'+celCong+'</td>'
      +'<td>'+selH+'</td><td>'+selD+'</td>'
      +'<td style="min-width:130px;font-size:12px">'+tituloCel+'</td>'
      +'<td><span class="badge '+eB+'">'+eT+'</span></td>'
      +'<td><select class="pi" data-id="'+pid+'" data-f="confirmado" onchange="pFld(this)"><option '+(normConf(p.confirmado)==='Por confirmar'?'selected':'')+'>Por confirmar</option><option '+(normConf(p.confirmado)==='Si'?'selected':'')+'>Si</option><option '+(normConf(p.confirmado)==='No'?'selected':'')+'>No</option></select></td>'
      +'<td><input type="text" class="pi" value="'+esc(p.obs||'')+'" data-id="'+pid+'" data-f="obs" onchange="pFld(this)" placeholder="Obs." style="min-width:60px"></td>'
      +'<td><button class="btn bd2 bsm" data-id="'+pid+'" onclick="delFP(this)">x</button></td></tr>';
  });
  tb.innerHTML=html;
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.pe.indexOf(c.dataset.id)>=0;});
}

function normName(v){return(v||'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

function hermanoProgramadoSalidaMes(h){return !!asignacionMesHermano(h,'');}

function sugerenciasSalidas(){
  var lista=[];
  D.locales.filter(function(h){return h.estado==='Activo'&&h.puedeAfuera==='si';}).forEach(function(h){
    // Excluir si ya tiene asignacion en el mes configurado
    var mesAsignado=asignacionMesHermano(h,'');
    if(mesAsignado)return;
    // Debe tener repertorio disponible para salir
    var reps=D.repertorioLocal.filter(function(r){
      return r.hermanoId===h.id&&r.estado==='Activo'&&r.puedeAfuera==='si'&&esDiscursoActivo(r.numDiscurso);
    }).sort(function(a,b){return a.numDiscurso-b.numDiscurso;});
    if(!reps.length)return;
    var ult=ultimaAsignacionHermano(h,'');
    var dias=ult?diasDesde(ult.fecha,refMes()):Infinity;
    lista.push({
      h:h,
      ultima:ult?ult.fecha:null,
      origen:ult?ult.origen:'',
      dias:dias,
      discursos:reps.map(function(r){return r.numDiscurso;}).join(' - '),
      rec:!ult?'Nunca ha salido':'Hace '+dias+' dias'
    });
  });
  // Ordenar por mas tiempo sin salir y retornar top 6
  return lista.sort(function(a,b){
    if(a.dias===Infinity&&b.dias!==Infinity)return -1;
    if(b.dias===Infinity&&a.dias!==Infinity)return 1;
    return b.dias-a.dias;
  }).slice(0,6);
}

function renderSugSalidas(){
  var box=document.getElementById('sug-salidas');if(!box)return;
  var lista=sugerenciasSalidas();
  if(!lista.length){box.innerHTML='<div class="al als" style="margin-bottom:10px">No hay hermanos pendientes de salida segun los plazos configurados: ancianos sobre 2 meses y siervos ministeriales sobre 4 meses.</div>';return;}
  var rows=lista.map(function(x){
    var ult=x.ultima?fmtF(x.ultima)+'<br><span style="font-size:11px;color:var(--tx3)">'+x.dias+' dias al 1 de '+nMes(D.config.mes)+(x.origen?' · '+esc(x.origen):'')+'</span>':'Nunca';
    return '<tr><td>'+esc(x.h.nombre)+'</td><td>'+esc(x.h.nombramiento)+'</td><td>'+ult+'</td><td>'+x.discursos+'</td><td><span class="badge bye">'+x.rec+'</span></td><td><button class="btn bp bsm" data-id="'+x.h.id+'" onclick="usarSugSalida(this)">Usar</button></td></tr>';
  }).join('');
  box.innerHTML='<div class="al alw" style="margin-bottom:10px"><strong>Hermanos sugeridos para salir</strong><br>Se consideran solo hermanos activos, disponibles para salir, con repertorio marcado para salida, sin asignaciones en el mes configurado, y que cumplan la rotacion: ancianos 2 meses / siervos ministeriales 4 meses. El calculo se realiza al 1 de '+nMes(D.config.mes)+' '+D.config.anio+'.</div>'
    +'<div class="tw"><table><thead><tr><th>Hermano</th><th>Nombramiento</th><th>Ultima asignacion</th><th>Discursos disponibles</th><th>Recomendacion</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function usarSugSalida(el){
  var h=D.locales.find(function(x){return x.id===el.dataset.id;});if(!h)return;
  if(!haySalidasPlan())D.config.habraSalidasMes='si';
  var cong=D.config.congregacionExternaMes||'';
  var fecha=cong?fechaSugeridaDestino(cong,''):'';
  var nsp={id:uid(),tipo:'Salida',_origen:'Local',_hermanoId:h.id,fecha:fecha,congregacion:cong,hermano:h.nombre,numDiscurso:'',titulo:'',confirmado:'Por confirmar',obs:''};
  D.planificacion.push(nsp);dbUpsertItem('planificacion',nsp);renderPlan();toast('Hermano agregado a salidas. Selecciona el discurso.','s');
}

function renderPlanSal(lista){
  var tb=document.getElementById('tb-ps');
  if(!lista.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--tx3);padding:20px">Sin salidas. Usa + Agregar salida si este mes corresponde.</td></tr>';return;}
  var pS=D.locales.filter(function(h){return h.estado==='Activo'&&h.puedeAfuera==='si';}).sort(function(a,b){return a.nombre.localeCompare(b.nombre);});
  var destinos=congsDestino();
  var html='';
  lista.forEach(function(p){
    var pid=p.id,sel=_sel.ps.indexOf(pid)>=0;
    var infoSal=p._hermanoId?calcRecSalida(p._hermanoId,pid):null;
    var eSB=infoSal?(infoSal.estado==='Disponible'?'bgn':'brd'):'bgr';
    var eST=infoSal?(infoSal.estado==='Disponible'?'OK':'Bloq.'):'---';
    var opH=pS.map(function(h){return '<option value="'+h.id+'" '+(p._hermanoId===h.id?'selected':'')+'>'+esc(h.nombre)+'</option>';}).join('');
    var selC='<select class="pi" data-id="'+pid+'" onchange="pSDest(this)" style="min-width:130px">'+optionList(destinos,p.congregacion,'-- Destino --')+'</select>';
    var selH='<select class="pi" data-id="'+pid+'" onchange="pSH(this)" style="min-width:125px"><option value="">-- Hermano --</option>'+opH+'</select>';
    var selD;
    if(p._hermanoId){var rep=D.repertorioLocal.filter(function(r){return r.hermanoId===p._hermanoId&&r.puedeAfuera==='si'&&r.estado==='Activo'&&esDiscursoActivo(r.numDiscurso);}).sort(function(a,b){return a.numDiscurso-b.numDiscurso;});selD='<select class="pi" data-id="'+pid+'" onchange="pSD(this)" style="width:64px"><option value="">--</option>'+rep.map(function(r){return '<option value="'+r.numDiscurso+'" '+(p.numDiscurso==r.numDiscurso?'selected':'')+'>'+r.numDiscurso+'</option>';}).join('')+'</select>';}
    else selD='<input class="pi" type="number" style="width:64px" disabled placeholder="--">';
    html+='<tr class="'+(sel?'sel-row':'')+'"><td class="chk">'+chkBox('ps',pid)+'</td>'
      +'<td><input type="date" class="pi" value="'+esc(p.fecha||'')+'" data-id="'+pid+'" data-f="fecha" onchange="pFld(this)"></td>'
      +'<td>'+selC+'</td>'
      +'<td>'+selH+'</td><td>'+selD+'</td>'
      +'<td style="min-width:130px;font-size:12px">'+esc(p.titulo||'---')+'</td>'
      +'<td><span class="badge '+eSB+'">'+eST+'</span>'+(infoSal&&infoSal.ultima!=='Nunca'?'<br><span style="font-size:11px;color:var(--tx3)">'+(infoSal.motivo?esc(infoSal.motivo)+' · ':'')+fmtF(infoSal.ultima)+' · '+infoSal.dias+' dias al 1 de '+nMes(D.config.mes)+'</span>':'')+'</td>'
      +'<td><select class="pi" data-id="'+pid+'" data-f="confirmado" onchange="pFld(this)"><option '+(normConf(p.confirmado)==='Por confirmar'?'selected':'')+'>Por confirmar</option><option '+(normConf(p.confirmado)==='Si'?'selected':'')+'>Si</option><option '+(normConf(p.confirmado)==='No'?'selected':'')+'>No</option></select></td>'
      +'<td><input type="text" class="pi" value="'+esc(p.obs||'')+'" data-id="'+pid+'" data-f="obs" onchange="pFld(this)" placeholder="Obs." style="min-width:60px"></td>'
      +'<td><button class="btn bd2 bsm" data-id="'+pid+'" onclick="delFP(this)">x</button></td></tr>';
  });
  tb.innerHTML=html;
  tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=_sel.ps.indexOf(c.dataset.id)>=0;});
}

function pFld(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});
  if(!p)return;
  p[el.dataset.f]=el.value;
  /* Si cambia el numero de discurso, actualizar titulo desde catalogo */
  if(el.dataset.f==='numDiscurso'&&el.value){
    var num=parseInt(el.value);
    var disc=D.discursos.find(function(d){return d.numero===num;});
    if(disc&&disc.estado!=='Inactivo'){
      p.titulo=disc.titulo||'';
    }else if(!disc){
      p.titulo='';
    }
  }
  dbUpsertItem('planificacion',p);
  if(el.dataset.f==='fecha'||el.dataset.f==='numDiscurso')renderPlan();
  else valPlan();
}

function delFP(el){
  var id=el.dataset.id;
  D.planificacion=D.planificacion.filter(function(p){return p.id!==id;});
  dbDeleteItem('planificacion',id);
  renderPlan();
}

function agregarFE(){
  var item={id:uid(),tipo:'Externo',_origen:'Externo',_hermanoId:'',fecha:'',congregacion:'',hermano:'',numDiscurso:'',titulo:'',confirmado:'Por confirmar',obs:''};
  D.planificacion.push(item);
  dbUpsertItem('planificacion',item);
  renderPlan();
}

function agregarFS(){if(!haySalidasPlan()){D.config.habraSalidasMes='si';}var nfs={id:uid(),tipo:'Salida',_origen:'Local',_hermanoId:'',fecha:'',congregacion:D.config.congregacionExternaMes||'',hermano:'',numDiscurso:'',titulo:'',confirmado:'Por confirmar',obs:''};D.planificacion.push(nfs);dbUpsertItem('planificacion',nfs);renderPlan();}

function pOrig(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  if(el.value==='SC'){
    if(!(D.config.scNombre||'').trim()){toast('Primero registra el nombre del Superintendente de Circuito en Configuracion','e');renderPlan();return;}
    p.tipo='Externo';p._origen='SC';p.hermano=D.config.scNombre;p.telefono=D.config.scTel||'';p._hermanoId='';p.congregacion='Superintendente de Circuito';p.numDiscurso='';p.titulo='';
  }else{
    p.tipo='Externo';p._origen=el.value;p.hermano='';p._hermanoId='';p.numDiscurso='';p.titulo='';
    p.congregacion=el.value==='Local'?D.miCongr.nombre||'':'';
  }
  dbUpsertItem('planificacion',p);renderPlan();
}

function pCongExt(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  p.congregacion=el.value;p.hermano='';p._hermanoId='';p.numDiscurso='';p.titulo='';p._origen='Externo';
  dbUpsertItem('planificacion',p);renderPlan();
}

function pEH(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  var val=el.value;p.numDiscurso='';p.titulo='';
  if(val.substring(0,2)==='L:'){p._hermanoId=val.substring(2);p._origen='Local';var h=D.locales.find(function(x){return x.id===p._hermanoId;});p.hermano=h?h.nombre:'';p.telefono=h?h.telefono||'':'';p.congregacion=D.miCongr.nombre||'';}
  else if(val.substring(0,2)==='E:'){p.hermano=val.substring(2);p._hermanoId='';p._origen='Externo';p.telefono=telefonoOrador(p.congregacion,p.hermano,p.numDiscurso,'Externo');}
  else{p.hermano='';p.telefono='';p._hermanoId='';}
  dbUpsertItem('planificacion',p);renderPlan();
}

function pED(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  var n=parseInt(el.value)||'';
  if(n&&esDiscursoInactivo(n)){toast('Este discurso esta inactivo y no puede programarse.','e');p.numDiscurso='';p.titulo='';dbUpsertItem('planificacion',p);renderPlan();return;}
  p.numDiscurso=n;
  if(p._origen==='Local'){
    var r=D.repertorioLocal.find(function(r){return r.hermanoId===p._hermanoId&&r.numDiscurso===parseInt(el.value)&&esDiscursoActivo(r.numDiscurso);});var dc=discursoCat(n);p.titulo=(r&&r.titulo)?r.titulo:(dc?dc.titulo:'');p.telefono=telefonoOrador(p.congregacion,p.hermano,p.numDiscurso,'Local');
  }else{
    var cm=D.cargaMensual.find(function(c){return c.congregacion===p.congregacion&&c.hermano===p.hermano&&c.numDiscurso===parseInt(el.value)&&esDiscursoActivo(c.numDiscurso);});var dc2=discursoCat(n);p.titulo=(cm&&cm.titulo)?cm.titulo:(dc2?dc2.titulo:'');p.telefono=cm&&cm.telefono?cm.telefono:telefonoOrador(p.congregacion,p.hermano,p.numDiscurso,'Externo');
  }
  dbUpsertItem('planificacion',p);renderPlan();
}

function pSDest(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  p.congregacion=el.value;
  if(!p.fecha)p.fecha=fechaSugeridaDestino(p.congregacion,p.id);
  dbUpsertItem('planificacion',p);renderPlan();
}

function pSH(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  p._hermanoId=el.value;var h=D.locales.find(function(x){return x.id===el.value;});p.hermano=h?h.nombre:'';p.telefono=h?h.telefono||'':'';p.numDiscurso='';p.titulo='';dbUpsertItem('planificacion',p);renderPlan();
}

function pSD(el){
  var p=D.planificacion.find(function(x){return x.id===el.dataset.id;});if(!p)return;
  var n=parseInt(el.value)||'';
  if(n&&esDiscursoInactivo(n)){toast('Este discurso esta inactivo y no puede programarse.','e');p.numDiscurso='';p.titulo='';dbUpsertItem('planificacion',p);renderPlan();return;}
  p.numDiscurso=n;var r=D.repertorioLocal.find(function(r){return r.hermanoId===p._hermanoId&&r.numDiscurso===parseInt(el.value)&&esDiscursoActivo(r.numDiscurso);});var dcs=discursoCat(n);p.titulo=(r&&r.titulo)?r.titulo:(dcs?dcs.titulo:'');dbUpsertItem('planificacion',p);renderPlan();
}

function valPlan(){
  sincronizarDiscursosInactivos(false);
  var al=[];
  var ext=D.planificacion.filter(function(p){return p.tipo==='Externo'&&!esSC(p);});
  var sal=D.planificacion.filter(function(p){return p.tipo==='Salida'||p.tipo==='Local';});
  var nums=ext.filter(function(p){return p.numDiscurso&&esDiscursoActivo(p.numDiscurso);}).map(function(p){return parseInt(p.numDiscurso);});
  var dup=nums.filter(function(n,i){return nums.indexOf(n)!==i;});
  if(dup.length)al.push('Discursos repetidos en nuestra congregacion: N '+[...new Set(dup)].join(', '));
  D.planificacion.forEach(function(p){if(p.numDiscurso&&esDiscursoInactivo(p.numDiscurso))al.push('N '+p.numDiscurso+' esta inactivo y no puede usarse en programacion.');});
  ext.forEach(function(p){
    if(p.numDiscurso&&!esSC(p)&&esDiscursoActivo(p.numDiscurso)){
      var r=calcRec(parseInt(p.numDiscurso));
      if(r.estado==='Bloqueado')al.push('N '+p.numDiscurso+' ('+p.hermano+'): bloqueado al 1 de '+nMes(D.config.mes)+' - '+r.dias+' dias desde ultima vez (min '+D.config.diasBloqueo+')');
    }
  });
  if(haySalidasPlan()){
    sal.forEach(function(p){
      if(p._hermanoId){
        var rs=calcRecSalida(p._hermanoId,p.id);
        if(rs.estado==='Bloqueado')al.push(p.hermano+': '+(rs.motivo?rs.motivo+'. ':'')+'ultima asignacion el '+fmtF(rs.ultima)+'; '+rs.dias+' dias al 1 de '+nMes(D.config.mes)+' (regla: '+(rs.limiteMeses||limiteSalidaMeses(D.locales.find(function(h){return h.id===p._hermanoId;})))+' meses; corte '+(rs.corte?fmtF(rs.corte):'')+')');
      }
    });
  }
  D.planificacion.filter(function(p){return esSC(p);}).forEach(function(p){
    if(!(D.config.scNombre||'').trim())al.push('Hay una fila del Superintendente de Circuito, pero no esta registrado su nombre en Configuracion.');
    if(!p.titulo)al.push('Falta el tema obligatorio del Superintendente de Circuito para la fecha '+(p.fecha?fmtF(p.fecha):'sin fecha')+'.');
  });
  if(!haySalidasPlan()&&D.planificacion.some(function(p){return p.tipo==='Salida'||p.tipo==='Local';}))
    al.push('Hay salidas cargadas, pero la seccion de salidas esta desactivada. No se exportaran ni cerraran al mes.');
  var incExt=D.planificacion.filter(function(p){return p.tipo==='Externo'&&!esSC(p)&&(!p.hermano||!p.numDiscurso||!esDiscursoActivo(p.numDiscurso));}).length;
  var incSal=sal.filter(function(p){return !p.hermano||!p.numDiscurso||!esDiscursoActivo(p.numDiscurso);}).length;
  if(incExt)al.push(incExt+' orador(es) sin hermano, sin discurso o con discurso inactivo. Quedaran fuera al cerrar el mes.');
  if(incSal&&haySalidasPlan())al.push(incSal+' salida(s) sin hermano, sin discurso o con discurso inactivo. Quedaran fuera al cerrar el mes.');
  document.getElementById('pval').innerHTML=al.length
    ?al.map(function(a){return '<div class="al alw">'+a+'</div>';}).join('')
    :'<div class="al als">Sin alertas.</div>';
}

function guardarPlan(){dbSaveArray('planificacion');toast('Guardado','s');}

function filaCompletaCierre(p){
  if(esSC(p))return !!(p.fecha&&p.hermano&&p.titulo&&(D.config.scNombre||'').trim());
  if(p.tipo==='Externo')return !!(p.fecha&&p.numDiscurso&&p.hermano&&esDiscursoActivo(p.numDiscurso));
  if((p.tipo==='Salida'||p.tipo==='Local')&&haySalidasPlan())return !!(p.fecha&&p.numDiscurso&&p.hermano&&esDiscursoActivo(p.numDiscurso));
  return false;
}

function planAHist(){
  var comp=D.planificacion.filter(function(p){return filaCompletaCierre(p);});
  if(!comp.length){toast('No hay filas completas para cerrar','w');return;}
  confirmar('Cerrar el mes y repartir '+comp.length+' registro(s)? Los discursos dados en nuestra congregacion iran al historial interno y las salidas activas iran a Salidas realizadas.',function(){
    var r=pasarPlanAHistoriales(comp);
    D.planificacion=D.planificacion.filter(function(p){return !comp.find(function(c){return c.id===p.id;});});
    dbSaveArray('planificacion');renderPlan();poblarFiltAnio();poblarFiltAnioSal();toast(r.internos+' al historial interno, '+r.salidas+' a salidas realizadas','s');
  });
}

function safeUrl(u){
  u=(u||'').trim();
  if(!u)return '';
  if(!/^https?:\/\//i.test(u))return '';
  return u.replace(/"/g,'%22').replace(/</g,'%3C').replace(/>/g,'%3E');
}

function linkMapsSalon(label){
  var url=safeUrl(D.miCongr&&D.miCongr.mapsSalon);
  if(!url)return docTxt('---');
  return '<a href="'+esc(url)+'" target="_blank">'+docTxt(label||'Abrir ubicación en Google Maps')+'</a>';
}

function buildProgHTML(){
  var mc=D.miCongr||{},c=D.config;
  var ma=nMes(c.mes)+' '+c.anio;
  var datos=planMesRows(),ext=datos.ext,sal=datos.sal;
  var TH='padding:8px 10px;text-align:left;border-bottom:2px solid #333;font-size:12px;font-weight:bold';
  var TD='padding:7px 10px;border-bottom:1px solid #ccc;font-size:13px;vertical-align:top';
  function progVal(p,campo){
    // En la exportacion, si el discurso no esta confirmado,
    // se mantiene el nombre del hermano y solo los datos del discurso quedan como "Por confirmar".
    if(!esConfirmado(p)){
      if(campo==='hermano')return docTxt(p.hermano);
      if(campo==='n')return 'Por confirmar';
      if(campo==='titulo')return 'Por confirmar';
      return docTxt('');
    }
    if(campo==='hermano')return docTxt(p.hermano);
    if(campo==='n')return docTxt(p.numDiscurso);
    if(campo==='titulo')return docTxt(p.titulo);
    return docTxt('');
  }
  var tExt=ext.length?'<table><thead><tr><th style="'+TH+'">Fecha</th><th style="'+TH+'">Congregacion origen</th><th style="'+TH+'">Hermano</th><th style="'+TH+'">N</th><th style="'+TH+'">Tema</th></tr></thead><tbody>'+ext.map(function(p){return '<tr><td style="'+TD+'">'+fmtF(p.fecha)+'</td><td style="'+TD+'">'+docTxt(p.congregacion)+'</td><td style="'+TD+'">'+progVal(p,'hermano')+'</td><td style="'+TD+';text-align:center">'+progVal(p,'n')+'</td><td style="'+TD+'">'+progVal(p,'titulo')+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty">Sin oradores planificados para este mes.</p>';
  var tSal=sal.length?'<table><thead><tr><th style="'+TH+'">Fecha</th><th style="'+TH+'">Congregacion destino</th><th style="'+TH+'">Hermano</th><th style="'+TH+'">N</th><th style="'+TH+'">Tema</th></tr></thead><tbody>'+sal.map(function(p){return '<tr><td style="'+TD+'">'+fmtF(p.fecha)+'</td><td style="'+TD+'">'+docTxt(p.congregacion)+'</td><td style="'+TD+'">'+progVal(p,'hermano')+'</td><td style="'+TD+';text-align:center">'+progVal(p,'n')+'</td><td style="'+TD+'">'+progVal(p,'titulo')+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty">Sin salidas planificadas para este mes.</p>';
  var congs=uniq(ext.concat(sal).map(function(p){return p.congregacion;}).filter(function(n){return n&&n!==(mc.nombre||'')&&n!=='Superintendente de Circuito';}));
  var contacto='';
  if(congs.length===1){
    var ce=D.congregaciones.find(function(x){return x.nombre===congs[0];})||{};
    contacto='<div class="doc-box"><div class="box-title">Datos de la congregacion externa</div>'
      +'<div><strong>Congregacion:</strong> '+docTxt(congs[0])+'</div>'
      +'<div><strong>Direccion del Salon:</strong> '+docTxt(ce.direccion)+'</div>'
      +'<div><strong>Dia y horario de reunion:</strong> '+docReunion(ce.dia,ce.horario)+'</div>'
      +'<div><strong>Coordinador de discursos publicos:</strong> '+docCoord(ce.coordNombre,ce.coordTel,ce.coordEmail)+'</div></div>';
  }else if(congs.length>1){
    // Si la planificacion incluye varias congregaciones, no se muestra recuadro superior.
    // La congregacion de origen/destino queda indicada directamente en cada fila de las tablas.
    contacto='';
  }
  var ubicacionSalon='';
  if(safeUrl(mc.mapsSalon)){
    ubicacionSalon='<div class="doc-box"><div class="box-title">Ubicacion de nuestro Salon</div>'
      +'<div><strong>Direccion:</strong> '+docTxt(mc.direccion||'---')+'</div>'
      +'<div><strong>Google Maps:</strong> '+linkMapsSalon('Abrir ubicacion del Salon')+'</div></div>';
  }
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Programa '+ma+'</title>'
    +'<style>body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;margin:38px;max-width:900px}.doc-head{text-align:center;margin-bottom:18px}.doc-head h1{text-align:center;font-size:21px;margin:0 0 4px}.doc-sub{text-align:center;font-size:15px;font-weight:bold;margin-bottom:14px}.doc-box{border:1px solid #999;padding:12px 14px;line-height:1.55;margin-top:14px}.box-title{font-weight:bold;text-transform:uppercase;font-size:11px;letter-spacing:.03em;margin-bottom:5px}h2{font-size:13px;font-weight:bold;margin:24px 0 8px;text-transform:uppercase;border-bottom:2px solid #333;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}.contactos th{font-size:11px;text-align:left;border-bottom:1px solid #999;padding:5px}.contactos td{font-size:12px;border-bottom:1px solid #ddd;padding:5px;vertical-align:top}.empty{font-size:12px;color:#777;margin:10px 0 18px}.footer{margin-top:28px;font-size:10px;color:#777;text-align:right}@media print{body{margin:22mm}}</style></head><body>'
    +'<div class="doc-head"><h1>Programa de Discursos Publicos</h1><div class="doc-sub">'+docTxt(ma)+'</div></div>'
    +ubicacionSalon
    +contacto
    +'<h2>Oradores que daran discurso en nuestra congregacion</h2>'+tExt
    +(haySalidasPlan()?'<h2>Hermanos locales programados para salir</h2>'+tSal:'')
    +'<div class="footer">Generado el '+new Date().toLocaleDateString('es-CL')+'</div></body></html>';
}

function progVal(p,campo){
    // En la exportacion, si el discurso no esta confirmado,
    // se mantiene el nombre del hermano y solo los datos del discurso quedan como "Por confirmar".
    if(!esConfirmado(p)){
      if(campo==='hermano')return docTxt(p.hermano);
      if(campo==='n')return 'Por confirmar';
      if(campo==='titulo')return 'Por confirmar';
      return docTxt('');
    }
    if(campo==='hermano')return docTxt(p.hermano);
    if(campo==='n')return docTxt(p.numDiscurso);
    if(campo==='titulo')return docTxt(p.titulo);
    return docTxt('');
  }

function expPrograma(tipo){
  var html=buildProgHTML(),c=D.config,nom='programa_'+nMes(c.mes)+'_'+c.anio;
  if(tipo==='pdf'){var w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(function(){w.print();},600);}
  else{descargarWordHTML(nom,'Programa de discursos publicos',html);}
}

function planMesRows(){
  sincronizarDiscursosInactivos(false);
  var c=D.config,ym=c.anio+'-'+String(c.mes).padStart(2,'0');
  function delMes(p){return p.fecha&&p.fecha.slice(0,7)===ym;}
  var ext=D.planificacion.filter(function(p){return p.tipo==='Externo'&&delMes(p)&&planPermiteDiscurso(p);}).sort(function(a,b){return new Date(a.fecha)-new Date(b.fecha);});
  var sal=D.planificacion.filter(function(p){return haySalidasPlan()&&(p.tipo==='Salida'||p.tipo==='Local')&&delMes(p)&&planPermiteDiscurso(p)&&(p.fecha||p.congregacion||p.hermano||p.numDiscurso);}).sort(function(a,b){return new Date(a.fecha)-new Date(b.fecha);});
  return{ext:ext,sal:sal};
}

function delMes(p){return p.fecha&&p.fecha.slice(0,7)===ym;}

function progPlain(p,campo){
  if(!esConfirmado(p)){
    if(campo==='hermano')return p.hermano||'';
    if(campo==='n')return 'Por confirmar';
    if(campo==='titulo')return 'Por confirmar';
    return '';
  }
  if(campo==='hermano')return p.hermano||'';
  if(campo==='n')return p.numDiscurso||'';
  if(campo==='titulo')return p.titulo||'';
  return '';
}

function xesc(v){return(v===undefined||v===null?'':v).toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function xcol(n){var s='';while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-m)/26);}return s;}

function crc32buf(buf){
  var table=crc32buf.table;if(!table){table=[];for(var i=0;i<256;i++){var c=i;for(var j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[i]=c>>>0;}crc32buf.table=table;}
  var crc=0^(-1);for(var k=0;k<buf.length;k++)crc=(crc>>>8)^table[(crc^buf[k])&255];return(crc^(-1))>>>0;
}

function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}

function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}

function concatU8(parts){var len=0;parts.forEach(function(p){len+=p.length;});var out=new Uint8Array(len),o=0;parts.forEach(function(p){out.set(p,o);o+=p.length;});return out;}

function zipStore(files){
  var enc=new TextEncoder(),locals=[],centrals=[],offset=0;
  files.forEach(function(f){
    var name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32buf(data);
    var local=concatU8([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
    var central=concatU8([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    locals.push(local);centrals.push(central);offset+=local.length;
  });
  var cd=concatU8(centrals),body=concatU8(locals);
  var end=concatU8([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(body.length),u16(0)]);
  return new Blob([body,cd,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function exportarPlanXLSX(){
  var c=D.config,ma=nMes(c.mes)+' '+c.anio,datos=planMesRows(),ext=datos.ext,sal=datos.sal,rows=[];
  function add(vals,bold){rows.push({vals:vals,bold:!!bold});}
  add(['Programa de Discursos Publicos'],true);add([ma],true);add(['']);
  var mc=D.miCongr||{};
  var congs=uniq(ext.concat(sal).map(function(p){return p.congregacion;}).filter(function(n){return n&&n!==(mc.nombre||'')&&n!=='Superintendente de Circuito';}));
  if(congs.length===1){
    var ce=D.congregaciones.find(function(x){return x.nombre===congs[0];})||{};
    add(['Datos de la congregacion externa'],true);add(['Congregacion',congs[0]]);add(['Direccion del Salon',ce.direccion||'']);add(['Dia y horario de reunion',docReunion(ce.dia,ce.horario).replace(/<[^>]+>/g,'')]);add(['Coordinador',docCoord(ce.coordNombre,ce.coordTel,ce.coordEmail).replace(/<[^>]+>/g,'')]);add(['']);
  }
  add(['Oradores que daran discurso en nuestra congregacion'],true);add(['Fecha','Congregacion origen','Hermano','N','Tema'],true);
  if(ext.length){ext.forEach(function(p){add([fmtF(p.fecha),p.congregacion||'',progPlain(p,'hermano'),progPlain(p,'n'),progPlain(p,'titulo')]);});}else add(['Sin oradores planificados para este mes.']);
  if(haySalidasPlan()){
    add(['']);add(['Hermanos locales programados para salir'],true);add(['Fecha','Congregacion destino','Hermano','N','Tema'],true);
    if(sal.length){sal.forEach(function(p){add([fmtF(p.fecha),p.congregacion||'',progPlain(p,'hermano'),progPlain(p,'n'),progPlain(p,'titulo')]);});}else add(['Sin salidas planificadas para este mes.']);
  }
  var sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="28" customWidth="1"/><col min="3" max="3" width="28" customWidth="1"/><col min="4" max="4" width="12" customWidth="1"/><col min="5" max="5" width="55" customWidth="1"/></cols><sheetData>';
  rows.forEach(function(r,i){var rn=i+1;sheet+='<row r="'+rn+'">';r.vals.forEach(function(v,j){var cn=xcol(j+1)+rn;sheet+='<c r="'+cn+'" t="inlineStr" s="'+(r.bold?1:0)+'"><is><t>'+xesc(v)+'</t></is></c>';});sheet+='</row>';});
  sheet+='</sheetData><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="portrait" fitToWidth="1" fitToHeight="1"/></worksheet>';
  var files=[
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Programacion" sheetId="1" r:id="rId1"/></sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:'xl/styles.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'},
    {name:'xl/worksheets/sheet1.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+sheet}
  ];
  var blob=zipStore(files),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='programa_'+nMes(c.mes)+'_'+c.anio+'.xlsx';a.click();toast('Excel generado','s');
}


function exportarPlanCSV(){
  var datos=planMesRows();
  var rows=datos.ext.concat(haySalidasPlan()?datos.sal:[]);
  var cols=['Tipo','Fecha','Congregacion','Hermano','N','Tema'];
  var filas=rows.map(function(p){var h=progPlain(p,'hermano');var n=progPlain(p,'n');var t=progPlain(p,'titulo');return [p.tipo,p.fecha,p.congregacion,h,n,t].map(function(v){return '"'+(v||'').toString().replace(/"/g,'""')+'"';}).join(';');});
  var csv=[cols.join(';')].concat(filas).join('\r\n');
  var b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='planificacion_'+nMes(D.config.mes)+'_'+D.config.anio+'.csv';a.click();toast('CSV exportado','s');
}

function loadReporteOpts(){
  var m=document.getElementById('rpt-m'),a=document.getElementById('rpt-a');
  // Solo setear valor si el elemento existe y no tiene valor previo
  if(m&&!m.value){m.value=D.config.mes||new Date().getMonth()+1;}
  if(a&&!a.value){a.value=D.config.anio||new Date().getFullYear();}
}

function reporteMesRows(){
  var m=parseInt(document.getElementById('rpt-m')?document.getElementById('rpt-m').value:D.config.mes)||D.config.mes;
  var a=parseInt(document.getElementById('rpt-a')?document.getElementById('rpt-a').value:D.config.anio)||D.config.anio;
  var ym=a+'-'+String(m).padStart(2,'0');
  return D.historial.filter(function(h){return h.fecha&&h.fecha.slice(0,7)===ym&&(h.tipo==='Superintendente de Circuito'||esDiscursoActivo(h.numDiscurso));}).slice().sort(function(x,y){return new Date(x.fecha)-new Date(y.fecha);});
}

function congsExternasReporte(rows){
  return uniq(rows.filter(function(h){return h.tipo==='Externo'&&h.congregacion&&normName(h.congregacion)!==normName(D.miCongr.nombre);}).map(function(h){return h.congregacion;}));
}

function buildReporteHTML(){
  var m=parseInt(document.getElementById('rpt-m')?document.getElementById('rpt-m').value:D.config.mes)||D.config.mes;
  var a=parseInt(document.getElementById('rpt-a')?document.getElementById('rpt-a').value:D.config.anio)||D.config.anio;
  var ma=nMes(m)+' '+a;
  var rows=reporteMesRows();
  var TH='padding:8px 10px;text-align:left;border-bottom:2px solid #333;font-size:12px;font-weight:bold';
  var TD='padding:7px 10px;border-bottom:1px solid #ccc;font-size:13px;vertical-align:top';
  var congs=congsExternasReporte(rows),contacto='';
  if(congs.length===1){
    var ce=D.congregaciones.find(function(x){return normName(x.nombre)===normName(congs[0]);})||{};
    contacto='<div class="doc-box"><div class="box-title">Datos de coordinacion de la congregacion externa</div>'
      +'<div><strong>Congregacion:</strong> '+docTxt(congs[0])+'</div>'
      +'<div><strong>Direccion del Salon:</strong> '+docTxt(ce.direccion)+'</div>'
      +'<div><strong>Dia y horario de reunion:</strong> '+docReunion(ce.dia,ce.horario)+'</div>'
      +'<div><strong>Coordinador de discursos publicos:</strong> '+docCoord(ce.coordNombre,ce.coordTel,ce.coordEmail)+'</div></div>';
  }
  var tabla=rows.length?'<table><thead><tr><th style="'+TH+'">Fecha</th><th style="'+TH+'">Tipo</th><th style="'+TH+'">Congregacion origen</th><th style="'+TH+'">Orador</th><th style="'+TH+'">Contacto orador</th><th style="'+TH+'">N</th><th style="'+TH+'">Tema</th><th style="'+TH+'">Obs.</th></tr></thead><tbody>'+rows.map(function(h){
    var tel=contactoOradorHist(h)||'No registrado';
    return '<tr><td style="'+TD+'">'+fmtF(h.fecha)+'</td><td style="'+TD+'">'+docTxt(h.tipo)+'</td><td style="'+TD+'">'+docTxt(h.congregacion)+'</td><td style="'+TD+'">'+docTxt(h.hermano)+'</td><td style="'+TD+'">'+docTxt(tel)+'</td><td style="'+TD+';text-align:center">'+docTxt(h.numDiscurso)+'</td><td style="'+TD+'">'+docTxt(h.titulo)+'</td><td style="'+TD+'">'+docTxt(h.obs)+'</td></tr>';
  }).join('')+'</tbody></table>':'<p class="empty">Sin registros en el historial interno para este mes.</p>';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte '+ma+'</title>'
    +'<style>body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;margin:38px;max-width:980px}.doc-head{text-align:center;margin-bottom:18px}.doc-head h1{text-align:center;font-size:21px;margin:0 0 4px}.doc-sub{text-align:center;font-size:15px;font-weight:bold;margin-bottom:14px}.doc-box{border:1px solid #999;padding:12px 14px;line-height:1.55;margin-top:14px}.box-title{font-weight:bold;text-transform:uppercase;font-size:11px;letter-spacing:.03em;margin-bottom:5px}h2{font-size:13px;font-weight:bold;margin:24px 0 8px;text-transform:uppercase;border-bottom:2px solid #333;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}.empty{font-size:12px;color:#777;margin:10px 0 18px}.footer{margin-top:28px;font-size:10px;color:#777;text-align:right}@media print{body{margin:16mm}}</style></head><body>'
    +'<div class="doc-head"><h1>Reporte mensual de discursos publicos</h1><div class="doc-sub">'+docTxt(ma)+'</div></div>'
    +contacto+'<h2>Discursos en nuestra congregacion</h2>'+tabla
    +'<div class="footer">Generado el '+new Date().toLocaleDateString('es-CL')+'</div></body></html>';
}

function renderReporteMensual(){
  loadReporteOpts();
  var rows=reporteMesRows(),out=document.getElementById('rpt-preview');if(!out)return;
  var congs=congsExternasReporte(rows);
  var aviso=congs.length>1?'<div class="al ali">Hay varias congregaciones externas en el mes; por eso no se muestra recuadro unico de coordinador. Cada congregacion queda indicada en la tabla.</div>':congs.length===1?'<div class="al als">Se mostrara recuadro de coordinacion para '+esc(congs[0])+'.</div>':'';
  if(!rows.length){out.innerHTML='<div class="es"><div class="ic2">&#128196;</div><p>Sin registros en el historial interno para el mes seleccionado.</p></div>';return;}
  var html=aviso+'<div class="tw"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Congregacion origen</th><th>Orador</th><th>Contacto orador</th><th>N</th><th>Tema</th><th>Obs.</th></tr></thead><tbody>';
  rows.forEach(function(h){html+='<tr><td>'+fmtF(h.fecha)+'</td><td>'+esc(h.tipo||'')+'</td><td>'+esc(h.congregacion||'')+'</td><td>'+esc(h.hermano||'')+'</td><td>'+esc(contactoOradorHist(h)||'No registrado')+'</td><td><strong>'+esc(h.numDiscurso||'---')+'</strong></td><td>'+esc(h.titulo||'')+'</td><td>'+esc(h.obs||'')+'</td></tr>';});
  html+='</tbody></table></div>';
  out.innerHTML=html;
}

function expReporteMensual(tipo){
  var rows=reporteMesRows();if(!rows.length){toast('No hay registros para exportar','w');return;}
  var html=buildReporteHTML();
  var m=parseInt(document.getElementById('rpt-m').value)||D.config.mes,a=parseInt(document.getElementById('rpt-a').value)||D.config.anio,nom='reporte_discursos_'+nMes(m)+'_'+a;
  if(tipo==='pdf'){var w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(function(){w.print();},600);}
  else{descargarWordHTML(nom,'Reporte mensual de discursos publicos',html);}
}

function dlJSON(obj,nom){var b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nom;a.click();}

function exportarJSON(){dlJSON(Object.assign({},D,{_exp:new Date().toLocaleString('es-CL'),_v:'3'}),'respaldo_'+new Date().toISOString().slice(0,10)+'.json');toast('Exportado','s');}

function exportarMod(mod){if(!MODS[mod])return;var o={_modulo:mod,_nombre:MODS[mod],_exp:new Date().toLocaleString('es-CL'),_v:'3'};o[mod]=D[mod];dlJSON(o,'mod_'+mod+'_'+new Date().toISOString().slice(0,10)+'.json');toast('Exportado: '+MODS[mod],'s');}

function importarJSON(){
  var f=document.getElementById('imp-f').files[0];if(!f){toast('Selecciona un archivo','e');return;}
  var rd=new FileReader();
  rd.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      if(d._modulo){confirmar('Importar modulo "'+d._nombre+'"? Se fusionara con datos existentes.',function(){impParcial(d);});}
      else{confirmar('Importar respaldo COMPLETO? Reemplaza todos los datos.',function(){impCompleto(d);});}
    }catch(er){toast('Error al leer el archivo','e');}
  };rd.readAsText(f);
}

function impCompleto(d){
  if(!d.miCongr)d.miCongr=d.miCongregacion||{nombre:'',direccion:'',dia:'6',horario:'',coordNombre:'',coordTel:'',coordEmail:'',obs:''};
  if(!d.miCongr.dia)d.miCongr.dia='6';
  if(d.config&&d.config.congregacionLocal&&!d.miCongr.nombre)d.miCongr.nombre=d.config.congregacionLocal;
  if(d.congregaciones)d.congregaciones.forEach(function(c){if(!c.coordNombre)c.coordNombre=c.contacto||'';if(!c.coordTel)c.coordTel=c.telefono||'';if(!c.coordEmail)c.coordEmail='';if(!c.dia)c.dia='0';});
  if(d.arreglos)d.arreglos.forEach(function(a){normalizarArreglo(a);});
  Object.keys(MODS).forEach(function(k){if(d[k]!==undefined)D[k]=d[k];});
  if(D.config.habraSalidasMes===undefined)D.config.habraSalidasMes='no';
    if(D.config.habraSCMes===undefined)D.config.habraSCMes='no';
    if(D.config.scNombre===undefined)D.config.scNombre='';
    if(D.config.scTel===undefined)D.config.scTel='';
    if(D.config.scEmail===undefined)D.config.scEmail='';
    if(D.config.scObs===undefined)D.config.scObs='';
    (D.historial||[]).forEach(function(h){if(h.telefono===undefined)h.telefono='';});
  sincronizarDiscursosInactivos(false);dbSaveArray('historial');toast('Importado','s');topMeta();loadConfig();loadMC();renderDash();
}

function impParcial(d){
  var mod=d._modulo;if(!MODS[mod])return;
  if(mod==='congregaciones'&&d[mod])d[mod].forEach(function(c){if(!c.coordNombre)c.coordNombre=c.contacto||'';if(!c.coordTel)c.coordTel=c.telefono||'';if(!c.coordEmail)c.coordEmail='';if(!c.dia)c.dia='0';});
  if(mod==='arreglos'&&d[mod])d[mod].forEach(function(a){normalizarArreglo(a);});
  if(d[mod]!==undefined)D[mod]=d[mod];
  if(mod==='config'){
    if(D.config.habraSalidasMes===undefined)D.config.habraSalidasMes='no';
    if(D.config.habraSCMes===undefined)D.config.habraSCMes='no';
    if(D.config.scNombre===undefined)D.config.scNombre='';
    if(D.config.scTel===undefined)D.config.scTel='';
    if(D.config.scEmail===undefined)D.config.scEmail='';
    if(D.config.scObs===undefined)D.config.scObs='';
  }
  sincronizarDiscursosInactivos(false);dbSaveDoc('config');toast('Modulo "'+MODS[mod]+'" importado','s');topMeta();
}

function limpMod(mod){
  if(!MODS[mod])return;
  confirmar('Borrar datos de "'+MODS[mod]+'"?',function(){
    if(mod==='miCongr')D.miCongr={nombre:'',direccion:'',dia:'6',horario:'',coordNombre:'',coordTel:'',coordEmail:'',obs:''};
    else if(mod==='config')D.config={mes:new Date().getMonth()+1,anio:new Date().getFullYear(),congregacionExternaMes:'',diasBloqueo:365,discursosLocalesRequeridos:1,habraSalidasMes:'no',habraSCMes:'no',scNombre:'',scTel:'',scEmail:'',scObs:''};
    else if(mod==='privilegios'){D.privilegios=_privilegiosDefault.map(function(n){return{id:uid(),nombre:n};});}
    else if(mod==='arreglos')D.arreglos=[];
    else if(Array.isArray(D[mod]))D[mod]=[];
    dbSaveArray('arreglos');toast(MODS[mod]+' borrado','s');renderDash();
  });
}

function limpTodo(){
  openM('Eliminar TODOS los datos','<div class="al alw">Esta accion es irreversible.</div><p style="font-size:13px;margin-top:8px">Escribe <strong>ELIMINAR</strong> para confirmar:</p><div class="fg" style="margin-top:8px"><input id="conf-del" placeholder="ELIMINAR"></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Eliminar todo',c:'bd2',fn:function(){
      if(document.getElementById('conf-del').value!=='ELIMINAR'){toast('Escribe ELIMINAR','e');return;}
      localStorage.removeItem('dp_v3');localStorage.removeItem('discursos_app_v2');
      D={miCongr:{nombre:'',direccion:'',dia:'6',horario:'',circuito:'',mapsSalon:'',coordNombre:'',coordTel:'',coordEmail:'',avNombre:'',avTel:'',avEmail:'',obs:''},config:{mes:new Date().getMonth()+1,anio:new Date().getFullYear(),congregacionExternaMes:'',diasBloqueo:365,discursosLocalesRequeridos:1,habraSalidasMes:'no',habraSCMes:'no',scNombre:'',scTel:'',scEmail:'',scObs:'',plantillaCarta:'',plantillaWhatsApp:''},discursos:[],locales:[],repertorioLocal:[],congregaciones:[],arreglos:[],cargaMensual:[],planificacion:[],historial:[],salidasRealizadas:[],privilegios:[]};
      closeM();toast('Datos eliminados','s');renderDash();
    }}]);
}

function exportarHistCSV(){
  var cols=['Fecha','Tipo','Congregacion','Hermano','Telefono','N','Titulo','Obs.'];
  var filas=D.historial.filter(function(h){return h.tipo==='Superintendente de Circuito'||esDiscursoActivo(h.numDiscurso);}).slice().sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);}).map(function(h){return [h.fecha,h.tipo,h.congregacion,h.hermano,h.telefono||telefonoParaHist(h),h.numDiscurso,h.titulo,h.obs].map(function(v){return '"'+(v||'').toString().replace(/"/g,'""')+'"';}).join(';');});
  var csv=[cols.join(';')].concat(filas).join('\r\n');
  var b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='historial_'+new Date().toISOString().slice(0,10)+'.csv';a.click();toast('CSV exportado','s');
}

function exportarSalidasCSV(){
  var cols=['Fecha','Congregacion destino','Hermano local','N','Titulo','Obs.'];
  var filas=D.salidasRealizadas.filter(function(s){return esDiscursoActivo(s.numDiscurso);}).slice().sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);}).map(function(s){return [s.fecha,s.congregacion,s.hermano,s.numDiscurso,s.titulo,s.obs].map(function(v){return '"'+(v||'').toString().replace(/"/g,'""')+'"';}).join(';');});
  var csv=[cols.join(';')].concat(filas).join('\r\n');
  var b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='salidas_realizadas_'+new Date().toISOString().slice(0,10)+'.csv';a.click();toast('CSV de salidas exportado','s');
}

function renderGuia(){
  var pasos=[
    {t:'Mi Congregacion',d:'Configura nombre, salon, dia de la semana en que se da el discurso publico y datos del coordinador.'},
    {t:'Congregaciones Externas',d:'Agrega cada congregacion con su salon, dia de discurso publico y datos del coordinador.'},
    {t:'Arreglos de conferencias',d:'Registra los arreglos conversados por mes y ano. Al guardar, los datos quedan sincronizados con Congregaciones externas y pueden cargarse automaticamente en Configuracion.'},
    {t:'Configuracion del mes',d:'Selecciona mes, ano y parametros generales. La congregacion externa del mes queda como referencia, pero en la planificacion puedes indicar la congregacion origen por cada fila.'},
    {t:'Catalogo de Discursos',d:'Carga los discursos o importa masivo con formato N | Titulo.'},
    {t:'Hermanos Locales',d:'Registra cada hermano con nombramiento, si puede salir y si puede dar localmente.'},
    {t:'Repertorio Local',d:'Indica que discursos puede dar cada hermano y en que modalidad (local/afuera).'},
    {t:'Carga Mensual Externa',d:'Importa las listas enviadas por una o varias congregaciones. Cada registro conserva su congregacion de origen.'},
    {t:'Generar Planificacion',d:'Desde Planificacion, usa "Generar fechas del mes". Se crean las fechas del discurso en nuestra congregacion. Si habra salidas, activa la opcion y agregalas en la segunda seccion.'},
    {t:'Asignar oradores',d:'Completa cada fila: si es externo, primero selecciona congregacion origen, luego hermano y discurso; si es local, elige hermano local y solo veras su repertorio disponible.'},
    {t:'Exportar programa',d:'PDF, Word o Excel con la lista de oradores y salidas del mes.'},
    {t:'Reporte mensual',d:'Despues de cerrar el mes, consulta el historial interno por mes y genera un reporte para sonido y video con contacto del orador y detalles de la conferencia.'},
    {t:'Importar historial interno',d:'Carga los ultimos 12 meses en Historial interno. Solo deben ir discursos dados en nuestra congregacion.'},
    {t:'Cerrar mes',d:'Al cerrar el mes, la app envia los discursos dados en nuestra congregacion al historial interno y las salidas a Salidas realizadas.'},
    {t:'Respaldo',d:'Exporta JSON completo o por modulo. Puedes importar luego y fusionar modulos individuales.'}
  ];
  document.getElementById('guia-c').innerHTML='<div class="ctit">Como usar la aplicacion</div>'+pasos.map(function(p,i){return '<div class="gs"><div class="gn2">'+(i+1)+'</div><div class="gt"><strong>'+p.t+'</strong><span>'+p.d+'</span></div></div>';}).join('');
}

function setupResponsive(){
  var btn=document.getElementById('mobileMenu');
  var bd=document.getElementById('sidebarBackdrop');
  if(btn)btn.onclick=function(){document.body.classList.toggle('nav-open');};
  if(bd)bd.onclick=function(){document.body.classList.remove('nav-open');};
  document.querySelectorAll('#sidebar .ni').forEach(function(n){
    n.addEventListener('click',function(){if(window.innerWidth<=900)document.body.classList.remove('nav-open');});
  });
  window.addEventListener('resize',function(){if(window.innerWidth>900)document.body.classList.remove('nav-open');});
}

function agregarPriv(){
  var n=document.getElementById('priv-n').value.trim();
  if(!n){toast('Escribe el nombre del privilegio','e');return;}
  if(D.privilegios.find(function(p){return p.nombre.toLowerCase()===n.toLowerCase();})){toast('Ya existe','e');return;}
  D.privilegios.push({id:uid(),nombre:n});
  var np=D.privilegios[D.privilegios.length-1];dbUpsertItem('privilegios',np);renderPrivilegios();toast('Privilegio agregado','s');
  document.getElementById('priv-n').value='';
}

function renderPrivilegios(){
  if(!document.getElementById('tb-priv'))return;
  var tb=document.getElementById('tb-priv');if(!tb)return;
  if(!D.privilegios.length){
    tb.innerHTML='<tr><td colspan="3"><div class="es"><div class="ic2">&#127894;</div><p>Sin privilegios. Agrega uno arriba.</p></div></td></tr>';
    return;
  }
  tb.innerHTML=D.privilegios.map(function(p){
    var sel=_sel.priv.indexOf(p.id)>=0;
    return '<tr class="'+(sel?'sel-row':'')+'"><td class="chk"><input type="checkbox" data-t="priv" data-id="'+p.id+'" onchange="onChk(this)"></td>'
      +'<td>'+esc(p.nombre)+'</td>'
      +'<td class="ac"><button class="btn bd2 bsm" data-fn="delPriv" data-id="'+p.id+'" onclick="dsp(this)">x</button></td></tr>';
  }).join('');
}

function delPriv(id){
  confirmar('Eliminar este privilegio?',function(){
    D.privilegios=D.privilegios.filter(function(p){return p.id!==id;});
    dbDeleteItem('privilegios',id);
    renderPrivilegios();toast('Eliminado','s');
  });
}

function nomPrivilegios(h){
  if(!h.privilegios||!h.privilegios.length)return '';
  return h.privilegios.map(function(pid){
    var p=D.privilegios.find(function(x){return x.id===pid;});
    return p?p.nombre:'';
  }).filter(Boolean).join(' & ');
}

function poblarPrivChksAdd(){
  var c=document.getElementById('priv-chks-add');if(!c)return;
  c.innerHTML=D.privilegios.map(function(p){
    return '<label style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:13px;cursor:pointer">'
      +'<input type="checkbox" class="priv-chk-add" data-id="'+p.id+'"> '+esc(p.nombre)+'</label>';
  }).join('');
}


function aplicarMarcadores(texto,ce){
  var c=D.config,mc=D.miCongr;
  return texto
    .replace(/\{\{mes\}\}/g,nMes(c.mes)+' '+c.anio)
    .replace(/\{\{congregacionDestino\}\}/g,c.congregacionExternaMes||'')
    .replace(/\{\{coordDestNombre\}\}/g,(ce&&ce.coordNombre)||'')
    .replace(/\{\{miCongr\}\}/g,mc.nombre||'')
    .replace(/\{\{circuito\}\}/g,mc.circuito||'')
    .replace(/\{\{direccion\}\}/g,mc.direccion||'')
    .replace(/\{\{dia\}\}/g,nomDia(mc.dia))
    .replace(/\{\{horario\}\}/g,mc.horario||'')
    .replace(/\{\{coordNombre\}\}/g,mc.coordNombre||'')
    .replace(/\{\{coordTel\}\}/g,mc.coordTel||'')
    .replace(/\{\{coordEmail\}\}/g,mc.coordEmail||'')
    .replace(/\{\{avNombre\}\}/g,mc.avNombre||'')
    .replace(/\{\{avTel\}\}/g,mc.avTel||'')
    .replace(/\{\{avEmail\}\}/g,mc.avEmail||'')
    .replace(/\{\{mapsSalon\}\}/g,mc.mapsSalon||'');
}

function plantillaWhatsAppDefault(){
  return 'Estimado hermano {{coordNombre}}, le saludamos cordialmente. Le escribimos por el arreglo de conferencias de {{mes}} con la congregacion {{congregacion}}.\n\nQuedamos atentos a cualquier antecedente o coordinacion que debamos considerar.\n\nMuchas gracias por su ayuda y buena disposicion.\n\nSaludos afectuosos,\n{{miCoordNombre}}\nCongregacion {{miCongr}}';
}

function resetPlantillaWhatsApp(){
  D.config.plantillaWhatsApp=plantillaWhatsAppDefault();
  dbSaveDoc('config');
  var el=document.getElementById('cfg-wa');if(el)el.value=D.config.plantillaWhatsApp;
  toast('Mensaje WhatsApp restaurado','s');
}

function aplicarMarcadoresWhatsApp(texto,a){
  a=a||{};var mc=D.miCongr||{};
  var mesTxt=nMes(parseInt(a.mes)||D.config.mes)+' '+(parseInt(a.anio)||D.config.anio);
  return (texto||plantillaWhatsAppDefault())
    .replace(/\{\{mes\}\}/g,mesTxt)
    .replace(/\{\{anio\}\}/g,String(parseInt(a.anio)||D.config.anio||''))
    .replace(/\{\{congregacion\}\}/g,a.congregacion||'')
    .replace(/\{\{congregacionDestino\}\}/g,a.congregacion||'')
    .replace(/\{\{estado\}\}/g,a.estado||'')
    .replace(/\{\{coordNombre\}\}/g,a.coordNombre||'')
    .replace(/\{\{coordTel\}\}/g,a.coordTel||'')
    .replace(/\{\{coordEmail\}\}/g,a.coordEmail||'')
    .replace(/\{\{direccion\}\}/g,a.direccion||'')
    .replace(/\{\{dia\}\}/g,nomDia(a.dia||0))
    .replace(/\{\{horario\}\}/g,a.horario||'')
    .replace(/\{\{miCongr\}\}/g,mc.nombre||'')
    .replace(/\{\{miCoordNombre\}\}/g,mc.coordNombre||'')
    .replace(/\{\{miCoordTel\}\}/g,mc.coordTel||'')
    .replace(/\{\{miCoordEmail\}\}/g,mc.coordEmail||'');
}

function estilosWordCartaPlanificacion(){
  return [
    '@page WordSection1{size:8.5in 11in;margin:0.62in 0.68in 0.62in 0.68in;mso-page-orientation:portrait;}',
    'div.WordSection1{page:WordSection1;}',
    'body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#1f2937;margin:0;line-height:1.35;background:#fff;}',
    'p{margin:0 0 8pt 0;line-height:1.45;text-align:justify;}',
    'table{width:100%;border-collapse:collapse;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt;}',
    'td,th{font-size:9.5pt;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;}',
    '.letter-hero{width:100%;border-collapse:collapse;margin:0 0 16pt 0;page-break-inside:avoid;}',
    '.letter-hero td{background:#EAF2FB;border:1pt solid #B9CCE2;padding:14pt 18pt;text-align:center;}',
    '.hero-title{font-size:15pt;font-weight:bold;color:#1F4E79;letter-spacing:.05em;text-transform:uppercase;margin:0 0 3pt 0;}',
    '.hero-sub{font-size:10.5pt;color:#44546A;font-weight:bold;margin:0;}',
    '.hero-month{font-size:9.5pt;color:#5B6778;margin-top:4pt;}',
    '.to-line{font-size:10pt;margin:0 0 12pt 0;}',
    '.section-title{font-size:9.5pt;text-transform:uppercase;font-weight:bold;color:#1F4E79;margin:0 0 6pt 0;letter-spacing:.04em;}',
    '.contact-box{border:1pt solid #C9D8EA;background:#F8FBFF;margin:13pt 0 15pt 0;page-break-inside:avoid;}',
    '.contact-box td{padding:5pt 7pt;border-bottom:1pt solid #E2E8F0;}',
    '.contact-label{width:34%;font-weight:bold;color:#344054;background:#F1F6FC;}',
    '.info-box{border-left:4pt solid #D6A64F;background:#FFFAF0;border-top:1pt solid #F2DCA8;border-right:1pt solid #F2DCA8;border-bottom:1pt solid #F2DCA8;margin:13pt 0 14pt 0;padding:10pt 12pt;page-break-inside:avoid;}',
    '.info-title{font-size:9.5pt;font-weight:bold;color:#8A5A00;text-transform:uppercase;margin:0 0 6pt 0;}',
    '.firma-wrap{margin-top:28pt;text-align:center;page-break-inside:avoid;}',
    '.firma-despedida{margin-bottom:24pt;text-align:center;}',
    '.firma-nombre{font-weight:bold;font-size:10.5pt;color:#1f2937;}',
    '.firma-cargo,.firma-contacto{font-size:9pt;color:#4b5563;line-height:1.25;}',
    '.page-break{page-break-before:always;}',
    'h2.anexo{font-size:10.5pt;font-weight:bold;margin:0 0 8pt 0;text-transform:uppercase;border-bottom:1.5pt solid #1F4E79;color:#1F4E79;padding-bottom:4pt;page-break-after:avoid;}',
    '.programa th{background:#2D5483;color:#fff;border:1pt solid #2D5483;padding:5pt 6pt;text-align:left;font-size:8.8pt;font-weight:bold;}',
    '.programa td{border:1pt solid #D7DFEA;padding:5pt 6pt;font-size:9pt;}',
    '.programa .small{font-size:8.2pt;color:#5B6778;line-height:1.2;}',
    '.por-confirmar{font-style:italic;color:#B86E00;}',
    '.rep-title{font-size:10pt;font-weight:bold;margin:14pt 0 6pt 0;color:#1F4E79;text-transform:uppercase;}',
    '.rep-table th{background:#EEF4FB;color:#1F4E79;border:1pt solid #C9D8EA;padding:5pt 6pt;text-align:left;font-size:8.8pt;font-weight:bold;}',
    '.rep-table td{border:1pt solid #D7DFEA;padding:5pt 6pt;font-size:9pt;}',
    '.footer{margin-top:12pt;font-size:8pt;color:#777;text-align:right;}',
    'strong{font-weight:bold;} em{font-style:italic;}',
    'a{color:#1F4E79;text-decoration:underline;}'
  ].join('');
}

function buildWordShellCartaPlanificacion(titulo,html){
  var body=extraerBodyHTML(html).replace(/<script[\s\S]*?<\/script>/gi,'');
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head>'
    +'<meta charset="UTF-8"><meta name="ProgId" content="Word.Document"><meta name="Generator" content="Coordinacion Discursos Publicos"><title>'+esc(titulo||'Documento')+'</title>'
    +'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->'
    +'<style>'+estilosWordCartaPlanificacion()+'</style></head><body><div class="WordSection1">'+body+'</div></body></html>';
}

function descargarWordHTMLCartaPlanificacion(nombre,titulo,html){
  var doc='\ufeff'+buildWordShellCartaPlanificacion(titulo,html);
  var b=new Blob([doc],{type:'application/msword;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download=nombre.replace(/[^a-z0-9_\-\.]+/gi,'_')+'.doc';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  toast('Word generado','s');
}

function datosConfirmacionArreglo(){
  var c=D.config;
  var sal=D.planificacion.filter(function(p){
    return (p.tipo==='Salida'||p.tipo==='Local')&&p.hermano&&(!p.numDiscurso||esDiscursoActivo(p.numDiscurso));
  }).sort(function(a,b){return new Date(a.fecha||'2999-12-31')-new Date(b.fecha||'2999-12-31');});
  if(!sal.length)return null;
  var congDest=c.congregacionExternaMes||sal[0].congregacion||'';
  var ce=D.congregaciones.find(function(x){return x.nombre===congDest;})||{};
  function hermanoPlan(p){
    if(p._hermanoId){
      var h=D.locales.find(function(x){return x.id===p._hermanoId;});
      if(h)return h;
    }
    return D.locales.find(function(x){return (x.nombre||'')===(p.hermano||'');})||null;
  }
  function telH(p){
    var h=hermanoPlan(p);
    return h&&h.telefono?h.telefono:(p.telefono||'---');
  }
  function cargoH(h){
    if(!h)return '';
    var privTxt=nomPrivilegios(h);
    return (h.nombramiento||'')+(privTxt?' & '+privTxt:'');
  }
  var hIds=[];
  sal.forEach(function(p){
    var h=hermanoPlan(p);
    if(h&&h.id&&hIds.indexOf(h.id)<0)hIds.push(h.id);
  });
  return {sal:sal,congDest:congDest,ce:ce,hermanoPlan:hermanoPlan,telH:telH,cargoH:cargoH,hIds:hIds};
}

function hermanoPlan(p){
    if(p._hermanoId){
      var h=D.locales.find(function(x){return x.id===p._hermanoId;});
      if(h)return h;
    }
    return D.locales.find(function(x){return (x.nombre||'')===(p.hermano||'');})||null;
  }

function telH(p){
    var h=hermanoPlan(p);
    return h&&h.telefono?h.telefono:(p.telefono||'---');
  }

function cargoH(h){
    if(!h)return '';
    var privTxt=nomPrivilegios(h);
    return (h.nombramiento||'')+(privTxt?' & '+privTxt:'');
  }

function buildCartaPlanificacionHTML(data){
  var c=D.config,mc=D.miCongr,ce=data.ce||{};
  var coordDest=ce.coordNombre||'';
  var mesTxt=nMes(c.mes)+' '+c.anio;
  var contactoCoord=[mc.coordTel,mc.coordEmail].filter(Boolean).join(' | ')||'---';
  var contactoAV=[mc.avTel,mc.avEmail].filter(Boolean).join(' | ')||'---';
  var html='';
  html+='<table class="letter-hero"><tr><td>'
    +'<div class="hero-title">Coordinacion de arreglo de conferencias</div>'
    +'<div class="hero-sub">'+esc(mc.nombre||'Mi Congregacion')+' / '+esc(data.congDest||'Congregacion destino')+'</div>'
    +'<div class="hero-month">Mes de '+esc(mesTxt)+'</div>'
    +'</td></tr></table>';
  html+='<div class="to-line"><strong>A:</strong> '+esc(coordDest||'Coordinador de discursos publicos')+'</div>';
  html+='<p><strong>Estimado hermano:</strong></p>';
  html+='<p>Reciba un afectuoso saludo. Esperamos sinceramente que usted y la congregacion se encuentren bien.</p>';
  html+='<p>Para nosotros es una alegria poder coordinar el arreglo de conferencias con su congregacion durante el mes de <strong>'+esc(mesTxt)+'</strong>. Con el proposito de facilitar la comunicacion y la coordinacion correspondiente, compartimos a continuacion nuestros datos de contacto:</p>';
  html+='<div class="section-title">Datos de contacto</div>';
  html+='<table class="contact-box">'
    +'<tr><td class="contact-label">Congregacion</td><td>'+esc(mc.nombre||'---')+'</td></tr>'
    +'<tr><td class="contact-label">Circuito</td><td>'+esc(mc.circuito||'---')+'</td></tr>'
    +'<tr><td class="contact-label">Direccion del Salon del Reino</td><td>'+esc(mc.direccion||'---')+'</td></tr>'
    +'<tr><td class="contact-label">Google Maps del Salon</td><td>'+linkMapsSalon('Abrir ubicacion en Google Maps')+'</td></tr>'
    +'<tr><td class="contact-label">Horario de reunion</td><td>'+esc(nomDia(mc.dia)+' '+(mc.horario||''))+'</td></tr>'
    +'<tr><td class="contact-label">Coordinador de discursos publicos</td><td><strong>'+esc(mc.coordNombre||'---')+'</strong><br>'+esc(contactoCoord)+'</td></tr>'
    +'<tr><td class="contact-label">Contacto de Audio y Video</td><td><strong>'+esc(mc.avNombre||'---')+'</strong><br>'+esc(contactoAV)+'</td></tr>'
    +'</table>';
  html+='<div class="info-box">'
    +'<div class="info-title">Informacion importante</div>'
    +'<p>Adicionalmente, cada semana contamos con arreglo de hospitalidad para los hermanos que nos visitan. Por esta razon, agradeceremos que puedan confirmar si los conferenciantes que asistiran a nuestra congregacion podran quedarse a la hospitalidad.</p>'
    +'<p>De ser posible, esta informacion deberia enviarse a mas tardar el miercoles de cada semana, a fin de que los hermanos de cada grupo puedan realizar los arreglos correspondientes con la debida anticipacion.</p>'
    +'</div>';
  html+='<p>En la pagina siguiente encontrara el detalle de los conferenciantes que proponemos enviar a su congregacion, junto con los bosquejos de discursos publicos que tienen disponibles.</p>';
  html+='<p>Agradecemos mucho su apoyo, colaboracion y buena disposicion para llevar adelante este arreglo.</p>';
  html+='<div class="firma-wrap">'
    +'<div class="firma-despedida">Se despide afectuosamente,</div>'
    +'<div class="firma-nombre">'+esc(mc.coordNombre||'')+'</div>'
    +'<div class="firma-cargo">Encargado de Conferencias Congregacion '+esc(mc.nombre||'')+'</div>'
    +'<div class="firma-contacto">'+esc(contactoCoord)+'</div>'
    +'</div>';
  return html;
}

function buildAnexoConfirmacionHTML(data){
  var sal=data.sal;
  var filas=sal.map(function(p){
    var h=data.hermanoPlan(p);
    var discObj=p.numDiscurso?D.discursos.find(function(d){return parseInt(d.numero)===parseInt(p.numDiscurso);}):null;
    var discTit=discObj?discObj.titulo:(p.titulo||'');
    var disc=p.numDiscurso?(esc(p.numDiscurso)+' - '+esc(discTit||'Sin titulo')):'<span class="por-confirmar">Por confirmar</span>';
    return '<tr>'
      +'<td style="width:16%">'+(p.fecha?fmtF(p.fecha):'Sin fecha')+'</td>'
      +'<td style="width:28%"><strong>'+esc(p.hermano)+'</strong><br><span class="small">'+esc(data.cargoH(h))+'</span></td>'
      +'<td style="width:38%">'+disc+'</td>'
      +'<td style="width:18%">'+esc(data.telH(p))+'</td>'
      +'</tr>';
  }).join('');
  var tabla='<h2 class="anexo">Anexo 1: conferenciantes propuestos y discursos disponibles</h2>'
    +'<table class="programa"><thead><tr>'
    +'<th style="width:16%">Fecha</th>'
    +'<th style="width:28%">Hermano</th>'
    +'<th style="width:38%">N° y titulo del discurso</th>'
    +'<th style="width:18%">Telefono</th>'
    +'</tr></thead><tbody>'+filas+'</tbody></table>';
  var repRows=data.hIds.map(function(hId){
    var h=D.locales.find(function(x){return x.id===hId;});if(!h)return '';
    var discs=D.repertorioLocal.filter(function(r){
      return r.hermanoId===hId&&r.puedeAfuera==='si'&&r.estado==='Activo'&&esDiscursoActivo(r.numDiscurso);
    }).sort(function(a,b){return a.numDiscurso-b.numDiscurso;});
    var lista=discs.length
      ?discs.map(function(r){
        var dObj=D.discursos.find(function(d){return parseInt(d.numero)===parseInt(r.numDiscurso);});
        var tit=dObj?dObj.titulo:(r.titulo||'Sin titulo');
        return '<div><strong>'+esc(r.numDiscurso)+'</strong> - '+esc(tit)+'</div>';
      }).join('')
      :'<span class="small">Sin discursos para salida</span>';
    return '<tr>'
      +'<td style="width:30%"><strong>'+esc(h.nombre)+'</strong><br><span class="small">'+esc(data.cargoH(h))+'</span><br><span class="small">'+esc(h.telefono||'Sin telefono')+'</span></td>'
      +'<td style="width:70%">'+lista+'</td>'
      +'</tr>';
  }).join('');
  if(!repRows)repRows='<tr><td colspan="2">Sin repertorio disponible.</td></tr>';
  var repertorio='<div class="rep-title">Discursos disponibles por conferenciante</div>'
    +'<table class="rep-table"><thead><tr><th style="width:30%">Conferenciante</th><th style="width:70%">Discursos disponibles</th></tr></thead><tbody>'+repRows+'</tbody></table>';
  return tabla+repertorio+'<div class="footer">Generado el '+new Date().toLocaleDateString('es-CL')+'</div>';
}

function estilosCartaPlanificacionPDF(){
  return [
    '@page{size:A4;margin:0.5cm 1.2cm 0.5cm 1.2cm;}',
    'body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#1f2937;margin:0;line-height:1.3;background:#fff;}',
    'p{margin:0 0 7px 0;line-height:1.45;text-align:justify;}',
    'table{width:100%;border-collapse:collapse;table-layout:fixed;}',
    'td,th{font-size:10pt;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;}',
    '.letter-hero{margin:0 0 10px 0;page-break-inside:avoid;}',
    '.letter-hero td{background:#EAF2FB;border:1px solid #B9CCE2;padding:10px 14px;text-align:center;}',
    '.hero-title{font-size:15px;font-weight:bold;color:#1F4E79;letter-spacing:.06em;text-transform:uppercase;margin:0 0 3px 0;}',
    '.hero-sub{font-size:13px;color:#44546A;font-weight:bold;margin:0;}',
    '.hero-month{font-size:12px;color:#5B6778;margin-top:6px;}',
    '.to-line{font-size:10px;margin:0 0 8px 0;}',
    '.section-title{font-size:10px;text-transform:uppercase;font-weight:bold;color:#1F4E79;margin:0 0 5px 0;letter-spacing:.04em;}',
    '.contact-box{border:1px solid #C9D8EA;background:#F8FBFF;margin:8px 0 10px 0;page-break-inside:avoid;}',
    '.contact-box td{padding:4px 7px;border-bottom:1px solid #E2E8F0;}',
    '.contact-label{width:34%;font-weight:bold;color:#344054;background:#F1F6FC;}',
    '.info-box{border-left:5px solid #D6A64F;background:#FFFAF0;border-top:1px solid #F2DCA8;border-right:1px solid #F2DCA8;border-bottom:1px solid #F2DCA8;margin:8px 0 10px 0;padding:8px 10px;page-break-inside:avoid;}',
    '.info-title{font-size:11px;font-weight:bold;color:#8A5A00;text-transform:uppercase;margin:0 0 8px 0;}',
    '.firma-wrap{margin-top:16px;text-align:center;page-break-inside:avoid;}',
    '.firma-despedida{margin-bottom:30px;text-align:center;}',
    '.firma-nombre{font-weight:bold;font-size:12px;color:#1f2937;}',
    '.firma-cargo,.firma-contacto{font-size:10.5px;color:#4b5563;line-height:1.25;}',
    '.page-break{page-break-before:always;}',
    'h2.anexo{font-size:12px;font-weight:bold;margin:0 0 10px 0;text-transform:uppercase;border-bottom:2px solid #1F4E79;color:#1F4E79;padding-bottom:5px;page-break-after:avoid;}',
    '.programa th{background:#2D5483;color:#fff;border:1px solid #2D5483;padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;}',
    '.programa td{border:1px solid #D7DFEA;padding:7px 8px;font-size:10.5px;}',
    '.programa .small{font-size:9.5px;color:#5B6778;line-height:1.2;}',
    '.por-confirmar{font-style:italic;color:#B86E00;}',
    '.rep-title{font-size:11px;font-weight:bold;margin:18px 0 8px 0;color:#1F4E79;text-transform:uppercase;}',
    '.rep-table th{background:#EEF4FB;color:#1F4E79;border:1px solid #C9D8EA;padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;}',
    '.rep-table td{border:1px solid #D7DFEA;padding:7px 8px;font-size:10.5px;}',
    '.footer{margin-top:14px;font-size:9px;color:#777;text-align:right;}',
    'a{color:#1F4E79;text-decoration:underline;}'
  ].join('');
}

function buildConfirmacionArregloStyled(formato){
  var data=datosConfirmacionArreglo();
  if(!data)return null;
  var c=D.config;
  var css=formato==='word'?estilosWordCartaPlanificacion():estilosCartaPlanificacionPDF();
  var carta=buildCartaPlanificacionHTML(data);
  var anexo=buildAnexoConfirmacionHTML(data);
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Confirmacion Arreglo '+nMes(c.mes)+' '+c.anio+'</title><style>'+css+'</style></head><body>'
    +carta
    +'<div class="page-break"></div>'
    +anexo
    +'</body></html>';
}

function buildConfirmacionHTML(){return buildConfirmacionArregloStyled('pdf');}

function buildConfirmacionWordHTML(){return buildConfirmacionArregloStyled('word');}

function exportarConfirmacionArreglo(tipo){
  var sal=D.planificacion.filter(function(p){return(p.tipo==='Salida'||p.tipo==='Local')&&p.hermano;});
  if(!sal.length){toast('No hay salidas con hermano asignado','w');return;}
  var html=tipo==='word'?buildConfirmacionWordHTML():buildConfirmacionHTML();
  if(!html){toast('Sin datos','w');return;}
  var c=D.config,nom='confirmacion_arreglo_'+nMes(c.mes)+'_'+c.anio;
  if(tipo==='pdf'){
    var w=window.open('','_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(function(){w.print();},700);
  }else{
    descargarWordHTMLCartaPlanificacion(nom,'Confirmacion de arreglo',html);
  }
}

function importarCompleto(){
  var input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      confirmar('Importar y reemplazar TODOS los datos de esta congregacion?',function(){
        dbImportarJSON(ev.target.result);
      });
    };
    reader.readAsText(file);
  };
  input.click();
}

function saEditarCong(id,nombre,circuito,ciudad){
  openM('Editar congregacion',
    '<div class="fg"><label>Nombre</label><input id="sace-n" value="'+esc(nombre)+'" type="text"></div>'
    +'<div class="fg"><label>Circuito</label><input id="sace-c" value="'+esc(circuito)+'" type="text"></div>'
    +'<div class="fg"><label>Ciudad</label><input id="sace-ci" value="'+esc(ciudad)+'" type="text"></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:async function(){
      var n=document.getElementById('sace-n').value.trim();
      var c=document.getElementById('sace-c').value.trim();
      var ci=document.getElementById('sace-ci').value.trim();
      if(!n){toast('Nombre obligatorio','e');return;}
      var res=await _sb.from('congregaciones').update({nombre:n,circuito:c,ciudad:ci}).eq('id',id);
      if(res.error){toast('Error: '+res.error.message,'e');return;}
      toast('Actualizado','s');closeM();saCargarDatos();
    }}]
  );
}

function saToggleCong(id,activo){
  confirmar((activo?'Desactivar':'Activar')+' esta congregacion?',async function(){
    var res=await _sb.from('congregaciones').update({activo:!activo}).eq('id',id);
    if(res.error){toast('Error','e');return;}
    toast('Congregacion '+(activo?'desactivada':'activada'),'s');saCargarDatos();
  });
}

function saEliminarCong(id,nombre){
  confirmar('Eliminar la congregacion "'+nombre+'"? Esta accion no se puede deshacer.',async function(){
    var res=await _sb.from('congregaciones').delete().eq('id',id);
    if(res.error){toast('Error: '+res.error.message,'e');return;}
    toast('Congregacion eliminada','s');saCargarDatos();
  });
}

function sincronizarTitulosDiscursos(){
  /* Actualizar titulos en planificacion cuando cambia el catalogo */
  var changed=false;
  D.planificacion.forEach(function(p){
    if(!p.numDiscurso)return;
    var num=parseInt(p.numDiscurso);
    var disc=D.discursos.find(function(d){return d.numero===num;});
    if(disc&&disc.titulo&&disc.titulo!==p.titulo){
      p.titulo=disc.titulo;
      dbUpsertItem('planificacion',p);
      changed=true;
    }
  });
  /* Actualizar titulos en historial */
  D.historial.forEach(function(h){
    if(!h.numDiscurso)return;
    var num=parseInt(h.numDiscurso);
    var disc=D.discursos.find(function(d){return d.numero===num;});
    if(disc&&disc.titulo&&disc.titulo!==h.titulo){
      h.titulo=disc.titulo;
      dbUpsertItem('historial',h);
      changed=true;
    }
  });
  /* Actualizar titulos en repertorio */
  D.repertorioLocal.forEach(function(r){
    if(!r.numDiscurso)return;
    var num=parseInt(r.numDiscurso);
    var disc=D.discursos.find(function(d){return d.numero===num;});
    if(disc&&disc.titulo&&disc.titulo!==r.titulo){
      r.titulo=disc.titulo;
      dbUpsertItem('repertorioLocal',r);
      changed=true;
    }
  });
  /* Actualizar titulos en salidas */
  D.salidasRealizadas.forEach(function(s){
    if(!s.numDiscurso)return;
    var num=parseInt(s.numDiscurso);
    var disc=D.discursos.find(function(d){return d.numero===num;});
    if(disc&&disc.titulo&&disc.titulo!==s.titulo){
      s.titulo=disc.titulo;
      dbUpsertItem('salidasRealizadas',s);
      changed=true;
    }
  });
  if(changed)console.log('Titulos sincronizados');
}

async function saCrearCongregacion(){
  if(!_usr||_usr.rol!=='superadmin'){toast('Sin permisos','e');return;}
  var nombre=document.getElementById('sa-cong-nombre').value.trim();
  var circuito=document.getElementById('sa-cong-circuito').value.trim();
  var ciudad=document.getElementById('sa-cong-ciudad').value.trim();
  var adminEmail=document.getElementById('sa-cong-admin').value.trim().toLowerCase();
  var adminNombre=document.getElementById('sa-cong-admin-nombre').value.trim();
  if(!nombre||!circuito||!adminEmail){toast('Nombre, circuito y email son obligatorios','e');return;}
  // Generar congId: cong+iniciales+circuito+correlativo
  var iniciales=nombre.split(' ').map(function(w){return w[0]||'';}).join('').toLowerCase().replace(/[^a-z]/g,'').substring(0,4);
  var circ=circuito.toLowerCase().replace(/[^a-z0-9]/g,'');
  var baseId='cong'+iniciales+circ;
  syncBar(true,'Creando congregacion...');
  // Buscar correlativo
  var existing=await _sb.from('congregaciones').select('id').like('id',baseId+'%');
  var correlativo=String((existing.data||[]).length+1).padStart(3,'0');
  var congId=baseId+correlativo;
  // Crear congregacion
  var res=await _sb.from('congregaciones').insert({
    id:congId,nombre:nombre,circuito:circuito,ciudad:ciudad,
    base_id:baseId,activo:true,creado_por:_usr.email
  });
  if(res.error){syncBar(false);toast('Error: '+res.error.message,'e');return;}
  // Crear invitacion
  var link=await saCrearInvitacion(adminEmail,adminNombre,congId,'admin');
  syncBar(false);
  if(!link)return;
  toast('Congregacion creada! ID: '+congId,'s');
  ['sa-cong-nombre','sa-cong-circuito','sa-cong-ciudad','sa-cong-admin','sa-cong-admin-nombre'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  saCargarDatos();
  openM('Congregacion creada',
    '<div style="text-align:center">'
    +'<div style="font-size:32px;margin-bottom:12px">&#127881;</div>'
    +'<div style="font-weight:700;margin-bottom:4px">'+esc(nombre)+'</div>'
    +'<div style="font-size:13px;color:var(--tx3);margin-bottom:16px">ID: '+congId+'</div>'
    +'<div style="font-size:13px;margin-bottom:8px">Link de invitacion (48 horas):</div>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
    +'<input id="sa-link-txt" type="text" value="'+esc(link)+'" readonly style="flex:1;font-size:11px;padding:6px;border:1px solid var(--bd);border-radius:6px">'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:center">'
    +'<button class="btn bg bsm" onclick="saCopiarLink()">Copiar</button>'
    +'<button class="btn bg bsm" onclick="saCompartirWA()">WhatsApp</button>'
    +'</div></div>',
    null
  );
}


/* ── Resend Email ── */
var _RESEND_KEY = null;

async function _getResendKey(){
  if(_RESEND_KEY) return _RESEND_KEY;
  var res = await _sb.from('configuracion_sistema').select('valor').eq('clave','resend_api_key').single();
  if(res.data) _RESEND_KEY = res.data.valor;
  return _RESEND_KEY;
}

async function enviarEmailInvitacion(email, nombre, link, congNombre, rol){
  var roles = {superadmin:'Coordinador de Discursos Publicos',admin:'Administrador',
    coordinador:'Coordinador de Discursos Publicos',lector:'Lector',visor:'Visor'};
  var rolLabel = roles[rol] || rol;
  var htmlEmail = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
    +'<div style="background:#1a2332;padding:24px;text-align:center">'
    +'<h1 style="color:#fff;font-size:20px;margin:0">&#128218; Coordinador de Discursos</h1>'
    +'</div>'
    +'<div style="padding:32px;background:#f8fafc">'
    +'<h2 style="color:#1a2332;font-size:18px">Hola '+esc(nombre||email)+'</h2>'
    +'<p style="color:#444;line-height:1.6">Has sido invitado como <strong>'+esc(rolLabel)+'</strong> para la congregación <strong>'+esc(congNombre||'')+'</strong>.</p>'
    +'<div style="text-align:center;margin:32px 0">'
    +'<a href="'+link+'" style="background:#3A6EA5;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">Aceptar invitación</a>'
    +'</div>'
    +'<p style="color:#666;font-size:13px">Este enlace expira en 48 horas. Si no esperabas esta invitación, puedes ignorar este email.</p>'
    +'<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">'
    +'<p style="color:#999;font-size:12px;text-align:center">coordinadordiscursos.cl</p>'
    +'</div></div>';

  try {
    var res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (await _getResendKey()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Coordinador de Discursos <noreply@coordinadordiscursos.cl>',
        to: [email],
        subject: 'Invitacion al Coordinador de Discursos - ' + (congNombre||''),
        html: htmlEmail
      })
    });
    var data = await res.json();
    if(res.ok){
      console.log('Email enviado:', data.id);
      return true;
    } else {
      console.error('Error Resend:', data);
      return false;
    }
  } catch(e) {
    console.error('Error enviando email:', e);
    return false;
  }
}

async function saCrearInvitacion(email,nombre,congId,rol){
  var token=uid()+uid();
  var expira=new Date(Date.now()+48*60*60*1000);
  var res=await _sb.from('invitaciones').insert({
    token:token,email:email,nombre_invitado:nombre,
    cong_id:congId,rol:rol,usada:false,
    expira_en:expira.toISOString(),
    creado_por:_usr.email
  });
  if(res.error){toast('Error al crear invitacion: '+res.error.message,'e');return null;}
  var link=window.location.origin+'/onboarding.html?inv='+token;
  // Obtener nombre de congregacion
  var congRes=await _sb.from('congregaciones').select('nombre').eq('id',congId).single();
  var congNombre=congRes.data?congRes.data.nombre:'';
  // Enviar email automatico
  syncBar(true,'Enviando email...');
  var emailOk=await enviarEmailInvitacion(email,nombre,link,congNombre,rol);
  syncBar(false);
  if(emailOk){
    toast('Invitacion creada y email enviado a '+email,'s');
  } else {
    toast('Invitacion creada pero el email no se pudo enviar. Comparte el link manualmente.','w');
  }
  return link;
}

async function saCargarDatos(){
  // Congregaciones
  var res=await _sb.from('congregaciones').select('*').order('creado_en',{ascending:false});
  var el=document.getElementById('sa-lista-congs');
  if(el){
    if(!res.data||!res.data.length){
      el.innerHTML='<div class="es"><p>Sin congregaciones registradas</p></div>';
    } else {
      el.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="font-size:12px;color:var(--tx3);border-bottom:2px solid var(--bd)">'
        +'<th style="padding:8px;text-align:left">Nombre</th>'
        +'<th style="padding:8px;text-align:left">Circuito</th>'
        +'<th style="padding:8px;text-align:left">ID</th>'
        +'<th style="padding:8px;text-align:left">Estado</th>'
        +'<th style="padding:8px;text-align:left">Acciones</th>'
        +'</tr></thead><tbody>'
        +res.data.map(function(d){
          return '<tr style="border-bottom:1px solid var(--bd);font-size:13px" data-id="'+d.id+'" data-nombre="'+esc(d.nombre||'')+'" data-circuito="'+esc(d.circuito||'')+'" data-ciudad="'+esc(d.ciudad||'')+'" data-activo="'+(d.activo?'1':'0')+'">'
            +'<td style="padding:8px"><strong>'+esc(d.nombre||'')+'</strong></td>'
            +'<td style="padding:8px">'+esc(d.circuito||'')+'</td>'
            +'<td style="padding:8px;font-size:11px;color:var(--tx3)">'+d.id+'</td>'
            +'<td style="padding:8px"><span class="badge '+(d.activo?'bgn':'bgr')+'">'+(d.activo?'Activa':'Inactiva')+'</span></td>'
            +'<td style="padding:8px;white-space:nowrap">'
            +'<button class="btn bg bsm sa-edit-btn">Editar</button> '
            +'<button class="btn bsm '+(d.activo?'bd2':'bp')+' sa-tog-btn">'+(d.activo?'Desactivar':'Activar')+'</button> '
            +'<button class="btn bd2 bsm sa-del-btn">Eliminar</button>'
            +'</td></tr>';
        }).join('')+'</tbody></table></div>';
      el.querySelectorAll('.sa-edit-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');saEditarCong(tr.dataset.id,tr.dataset.nombre,tr.dataset.circuito,tr.dataset.ciudad);});
      });
      el.querySelectorAll('.sa-tog-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');saToggleCong(tr.dataset.id,tr.dataset.activo==='1');});
      });
      el.querySelectorAll('.sa-del-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');saEliminarCong(tr.dataset.id,tr.dataset.nombre);});
      });
    }
  }
  // Invitaciones
  var res2=await _sb.from('invitaciones').select('*').order('creado_en',{ascending:false}).limit(50);
  var el2=document.getElementById('sa-lista-invs');
  if(el2){
    if(!res2.data||!res2.data.length){
      el2.innerHTML='<div class="es"><p>Sin invitaciones</p></div>';
    } else {
      var ahora=new Date();
      el2.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="font-size:12px;color:var(--tx3);border-bottom:2px solid var(--bd)">'
        +'<th style="padding:8px;text-align:left">Email</th><th style="padding:8px;text-align:left">Rol</th>'
        +'<th style="padding:8px;text-align:left">Congregacion</th><th style="padding:8px;text-align:left">Estado</th>'
        +'</tr></thead><tbody>'
        +res2.data.map(function(d){
          var expira=d.expira_en?new Date(d.expira_en):null;
          var estado=d.usada?'usada':(expira&&ahora>expira?'expirada':'pendiente');
          var cls=estado==='usada'?'badge-inv-usada':estado==='expirada'?'badge-inv-exp':'badge-inv-pend';
          var label=estado==='usada'?'Usada':estado==='expirada'?'Expirada':'Pendiente';
          return '<tr style="border-bottom:1px solid var(--bd);font-size:13px">'
            +'<td style="padding:8px">'+esc(d.email||'')+'</td>'
            +'<td style="padding:8px"><span class="badge bbl">'+esc(d.rol||'')+'</span></td>'
            +'<td style="padding:8px;font-size:11px">'+esc(d.cong_id||'')+'</td>'
            +'<td style="padding:8px"><span class="'+cls+'">'+label+'</span></td>'
            +'</tr>';
        }).join('')+'</tbody></table></div>';
    }
  }
}


function compartirWhatsApp(){
  var linkTxt = document.getElementById('usr-inv-link-txt');
  if(!linkTxt||!linkTxt.value){toast('Sin link de invitacion','e');return;}
  var nombre = document.getElementById('usr-inv-nombre').value.trim()||'';
  var msg = 'Hola'+(nombre?' '+nombre:'')+', has sido invitado al Coordinador de Discursos Publicos.'
    +'\n\nPara activar tu cuenta, ingresa al siguiente enlace (valido por 48 horas):'
    +'\n'+linkTxt.value
    +'\n\nSi tienes dudas, consulta con quien te envio esta invitacion.';
  var url = 'https://wa.me/?text='+encodeURIComponent(msg);
  window.open(url,'_blank');
}

async function usrInvitar(){
  if(!_usr||(_usr.rol!=='admin'&&_usr.rol!=='superadmin')){toast('Sin permisos','e');return;}
  var email=document.getElementById('usr-inv-email').value.trim().toLowerCase();
  var nombre=document.getElementById('usr-inv-nombre').value.trim();
  var tel=document.getElementById('usr-inv-tel').value.trim();
  var rol=document.getElementById('usr-inv-rol').value;
  var congId=_usr.rol==='superadmin'
    ?(document.getElementById('usr-inv-cong')?document.getElementById('usr-inv-cong').value:_usr.cong_id)
    :_usr.cong_id;
  if(!email||!nombre||!tel){toast('Nombre, telefono y email son obligatorios','e');return;}
  if(!congId){toast('Selecciona una congregacion','e');return;}
  syncBar(true,'Creando invitacion...');
  var link=await saCrearInvitacion(email,nombre,congId,rol);
  syncBar(false);
  if(!link)return;
  var linkEl=document.getElementById('usr-inv-link');
  var linkTxt=document.getElementById('usr-inv-link-txt');
  if(linkEl)linkEl.style.display='block';
  if(linkTxt)linkTxt.value=link;
  // Abrir WhatsApp automaticamente
  var telLimpio=tel.replace(/[^0-9+]/g,'');
  var roles={superadmin:'Super Administrador',admin:'Administrador',coordinador:'Coordinador de Discursos Publicos',lector:'Lector',visor:'Visor'};
  var rolLabel=roles[rol]||rol;
  var congRes=await _sb.from('congregaciones').select('nombre').eq('id',congId).single();
  var congNombre=congRes.data?congRes.data.nombre:'';
  var msg='Estimado/a '+nombre+', ha sido invitado como *'+rolLabel+'* para la congregacion *'+congNombre+'*.'
    +'\n\nPara activar su cuenta, ingrese al siguiente enlace (valido por 48 horas):\n'+link
    +'\n\nSi tiene dudas, consulte con quien le envio esta invitacion.';
  window.open('https://wa.me/'+telLimpio+'?text='+encodeURIComponent(msg),'_blank');
  toast('Invitacion creada!','s');
  usrCargarDatos();
}

function usrCopiarLink(){
  var txt=document.getElementById('usr-inv-link-txt');
  if(!txt)return;
  navigator.clipboard.writeText(txt.value).then(function(){toast('Link copiado!','s');}).catch(function(){txt.select();document.execCommand('copy');toast('Link copiado!','s');});
}



async function usrCargarDatos(){
  if(!_usr)return;
  var esSA=_usr.rol==='superadmin';
  // Poblar selector de congregaciones para superadmin
  if(esSA){
    var selCong=document.getElementById('usr-inv-cong');
    if(selCong){
      var congRes=await _sb.from('congregaciones').select('id,nombre').eq('activo',true).order('nombre');
      selCong.innerHTML='<option value="">Seleccionar...</option>'
        +(congRes.data||[]).map(function(c){
          return '<option value="'+c.id+'">'+c.nombre+'</option>';
        }).join('');
    }
  }
  // Cargar mapa de congregaciones
  var congRes=await _sb.from('congregaciones').select('id,nombre,circuito');
  var congMap={};
  (congRes.data||[]).forEach(function(c){congMap[c.id]=c;});
  // Cargar usuarios
  var qUsr=esSA
    ?_sb.from('usuarios').select('*').order('email')
    :_sb.from('usuarios').select('*').eq('cong_id',_usr.cong_id);
  var res=await qUsr;
  var el=document.getElementById('usr-lista');
  if(el){
    if(!res.data||!res.data.length){
      el.innerHTML='<div class="es"><p>Sin usuarios registrados</p></div>';
    } else {
      var rows=res.data.map(function(d){
        var cong=congMap[d.cong_id]||{};
        var rolBadge='<span class="badge '+(d.rol==='superadmin'||d.rol==='admin'?'bbl':d.rol==='coordinador'?'bgn':'bgy')+'">'+esc(d.rol||'')+'</span>';
        var estadoBadge='<span class="badge '+(d.activo?'bgn':'bgr')+'">'+(d.activo?'Activo':'Inactivo')+'</span>';
        return '<tr style="border-bottom:1px solid var(--bd);font-size:13px" data-email="'+esc(d.email)+'" data-nombre="'+esc(d.nombre||'')+'" data-rol="'+esc(d.rol||'')+'" data-activo="'+(d.activo?'1':'0')+'">'
          +(esSA?'<td style="padding:8px;font-size:11px">'+esc(cong.nombre||d.cong_id||'')+'</td>':'')
          +'<td style="padding:8px"><strong>'+esc(d.nombre||'')+'</strong></td>'
          +'<td style="padding:8px">'+esc(d.email)+'</td>'
          +'<td style="padding:8px">'+rolBadge+'</td>'
          +'<td style="padding:8px">'+estadoBadge+'</td>'
          +'<td style="padding:8px;white-space:nowrap">'
          +'<button class="btn bg bsm usr-edit-btn">Editar</button> '
          +'<button class="btn bsm '+(d.activo?'bd2':'bp')+' usr-tog-btn">'+(d.activo?'Desactivar':'Activar')+'</button> '
          +'<button class="btn bd2 bsm usr-del-btn">Eliminar</button>'
          +'</td></tr>';
      }).join('');
      el.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="font-size:12px;color:var(--tx3);border-bottom:2px solid var(--bd)">'
        +(esSA?'<th style="padding:8px;text-align:left">Congregacion</th>':'')
        +'<th style="padding:8px;text-align:left">Nombre</th>'
        +'<th style="padding:8px;text-align:left">Email</th>'
        +'<th style="padding:8px;text-align:left">Rol</th>'
        +'<th style="padding:8px;text-align:left">Estado</th>'
        +'<th style="padding:8px;text-align:left">Acciones</th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
      el.querySelectorAll('.usr-edit-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');usrEditar(tr.dataset.email,tr.dataset.nombre,tr.dataset.rol);});
      });
      el.querySelectorAll('.usr-tog-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');usrToggleActivo(tr.dataset.email,tr.dataset.activo==='1');});
      });
      el.querySelectorAll('.usr-del-btn').forEach(function(btn){
        btn.addEventListener('click',function(){var tr=btn.closest('tr');usrEliminar(tr.dataset.email);});
      });
    }
  }
}

function usrEditar(email,nombre,rol){
  openM('Editar usuario',
    '<div class="fg"><label>Nombre</label><input id="ue-nombre" value="'+esc(nombre)+'" type="text"></div>'
    +'<div class="fg"><label>Rol</label><select id="ue-rol">'
    +'<option value="visor" '+(rol==='visor'?'selected':'')+'>Visor</option>'
    +'<option value="lector" '+(rol==='lector'?'selected':'')+'>Lector</option>'
    +'<option value="coordinador" '+(rol==='coordinador'?'selected':'')+'>Coordinador</option>'
    +'<option value="admin" '+(rol==='admin'?'selected':'')+'>Admin</option>'
    +(_usr&&_usr.rol==='superadmin'?'<option value="superadmin" '+(rol==='superadmin'?'selected':'')+'>Super Admin</option>':'')
    +'</select></div>',
    [{l:'Cancelar',c:'bg',fn:closeM},{l:'Guardar',c:'bp',fn:async function(){
      var n=document.getElementById('ue-nombre').value.trim();
      var r=document.getElementById('ue-rol').value;
      if(!n){toast('Nombre obligatorio','e');return;}
      var res=await _sb.from('usuarios').update({nombre:n,rol:r}).eq('email',email);
      if(res.error){toast('Error: '+res.error.message,'e');return;}
      toast('Usuario actualizado','s');closeM();usrCargarDatos();
    }}]
  );
}

function usrEliminar(email){
  confirmar('Eliminar definitivamente al usuario '+email+'?',async function(){
    var res=await _sb.from('usuarios').delete().eq('email',email);
    if(res.error){toast('Error: '+res.error.message,'e');return;}
    toast('Usuario eliminado','s');usrCargarDatos();
  });
}

async function usrReinvitar(tokenViejo,email,nombre,rol,congId){
  confirmar('Crear nueva invitacion para '+email+'?',async function(){
    await _sb.from('invitaciones').update({usada:true}).eq('token',tokenViejo);
    var link=await saCrearInvitacion(email,nombre,congId||_usr.cong_id,rol);
    if(link){
      var linkEl=document.getElementById('usr-inv-link');
      var linkTxt=document.getElementById('usr-inv-link-txt');
      if(linkEl)linkEl.style.display='block';
      if(linkTxt)linkTxt.value=link;
      toast('Nueva invitacion creada','s');usrCargarDatos();
    }
  });
}

function usrCopiarLinkDirecto(link){
  navigator.clipboard.writeText(link).then(function(){
    toast('Link copiado!','s');
  }).catch(function(){
    var ta=document.createElement('textarea');
    ta.value=link;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    toast('Link copiado!','s');
  });
}

async function usrToggleActivo(email,activo){
  var res=await _sb.from('usuarios').update({activo:!activo}).eq('email',email);
  if(res.error){toast('Error','e');return;}
  toast('Usuario '+(activo?'desactivado':'activado'),'s');usrCargarDatos();
}

async function usrCancelarInv(token){
  confirmar('Cancelar esta invitacion?',async function(){
    await _sb.from('invitaciones').update({usada:true}).eq('token',token);
    toast('Invitacion cancelada','s');usrCargarDatos();
  });
}

async function invAceptar(){
  if(!_invPendiente)return;
  var inv=_invPendiente.inv,token=_invPendiente.token;
  var btn=document.getElementById('inv-aceptar-btn');
  if(btn){btn.disabled=true;btn.textContent='Procesando...';}
  var res=await _sb.from('usuarios').upsert({
    id:_usr.id,email:_usr.email,
    nombre:_usr.nombre||inv.nombre_invitado||'',
    rol:inv.rol||'lector',cong_id:inv.cong_id||'',activo:true
  },{onConflict:'email'});
  if(res.error){
    if(btn){btn.disabled=false;btn.textContent='Aceptar e ingresar';}
    toast('Error: '+res.error.message,'e');return;
  }
  await _sb.from('invitaciones').update({usada:true,usada_por:_usr.email}).eq('token',token);
  _invPendiente=null;
  window.history.replaceState({},'',window.location.pathname);
  location.reload();
}

function invRechazar(){
  _invPendiente=null;
  var invScreen=document.getElementById('inv-screen');
  if(invScreen)invScreen.classList.remove('show');
  window.history.replaceState({},'',window.location.pathname);
  _auth.signOut();
  location.reload();
}

function saCopiarLink(){
  var el=document.getElementById('sa-link-txt');
  if(!el)return;
  navigator.clipboard.writeText(el.value).then(function(){toast('Link copiado!','s');}).catch(function(){
    el.select();document.execCommand('copy');toast('Link copiado!','s');
  });
}

function saCompartirWA(){
  var el=document.getElementById('sa-link-txt');
  if(!el)return;
  var msg='Invitacion al Coordinador de Discursos Publicos:\n'+el.value;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

/* ============================================================
   SUPABASE — Auth + DB Layer
============================================================ */

/* ── Helpers ── */
function _congId(){ return (_usr && _usr.cong_id) || ''; }

function syncBar(show, msg){
  var el = document.getElementById('sync-indicator');
  if(!el) return;
  el.classList.toggle('show', !!show);
  var lbl = el.querySelector('.sync-label');
  if(lbl) lbl.textContent = msg || 'Sincronizando...';
}

function loginErr(msg){
  var el = document.getElementById('login-err');
  if(el) el.textContent = msg || '';
}

function mostrarLogin(){
  var el = document.getElementById('login-overlay');
  if(el){ el.classList.add('show'); el.style.display='flex'; }
}

function ocultarLogin(){
  var el = document.getElementById('login-overlay');
  if(el){ el.classList.remove('show'); el.style.display='none'; }
}

/* ── Auth ── */
async function doLogin(){
  var email = (document.getElementById('login-email') || {value:''}).value.trim();
  var pass = (document.getElementById('login-pass') || {value:''}).value;
  if(!email || !pass){ loginErr('Ingresa tu email y contraseña'); return; }
  var btn = document.getElementById('login-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Ingresando...'; }
  loginErr('');
  var res = await _sb.auth.signInWithPassword({email: email, password: pass});
  if(res.error){
    loginErr('Email o contraseña incorrectos');
    if(btn){ btn.disabled = false; btn.textContent = 'Ingresar'; }
  }
}

async function doLogout(){
  if(!confirm('Cerrar sesion?')) return;
  await _sb.auth.signOut();
  window.location.href = '/index.html';
}

async function doResetPassword(){
  var email = (document.getElementById('login-email') || {value:''}).value.trim();
  if(!email){ loginErr('Ingresa tu email primero'); return; }
  var res = await _sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://coordinadordiscursos.cl/index.html'
  });
  if(res.error){ loginErr('Error: ' + res.error.message); return; }
  alert('Se envio un email para restablecer tu contraseña.');
}

function actualizarChip(){
  var chip = document.getElementById('sb-user');
  if(!chip || !_usr) return;
  var roles = {superadmin:'Super Admin',admin:'Admin',coordinador:'Coordinador',lector:'Lector',visor:'Visor'};
  var inicial = ((_usr.nombre || 'U')[0]).toUpperCase();
  chip.innerHTML = '<div class="user-avatar">' + inicial + '</div>'
    + '<div class="user-info"><div class="user-name">' + esc(_usr.nombre || '') + '</div>'
    + '<div class="user-role">' + esc(roles[_usr.rol] || _usr.rol) + '</div></div>';
}

function aplicarRol(){
  if(!_usr) return;
  var esSA = _usr.rol === 'superadmin';
  var esAdmin = _usr.rol === 'admin' || esSA;
  var esCoord = _usr.rol === 'coordinador' || esAdmin;
  var esLector = _usr.rol === 'lector' || esCoord;
  document.querySelectorAll('[data-roles]').forEach(function(el){
    var roles = el.dataset.roles.split(',');
    var visible = roles.some(function(r){
      if(r === 'superadmin') return esSA;
      if(r === 'admin') return esAdmin;
      if(r === 'coordinador') return esCoord;
      if(r === 'lector') return esLector;
      return true;
    });
    el.style.display = visible ? '' : 'none';
  });
}

/* ── DB Layer — Supabase ── */
function _toRow(dKey, item){
  var cid = _congId();
  var m = {
    discursos: function(d){ return {id:d.id,cong_id:cid,numero:d.numero,titulo:d.titulo||'',estado:d.estado||'Activo',obs:d.obs||''}; },
    locales: function(h){ return {id:h.id,cong_id:cid,nombre:h.nombre||'',nombramiento:h.nombramiento||'',telefono:h.telefono||'',puede_afuera:h.puedeAfuera||'si',puede_local:h.puedeLocal||'si',estado:h.estado||'Activo',obs:h.obs||'',privilegios:JSON.stringify(h.privilegios||[])}; },
    repertorioLocal: function(r){ return {id:r.id,cong_id:cid,hermano_id:r.hermanoId||null,num_discurso:r.numDiscurso||null,titulo:r.titulo||'',puede_afuera:r.puedeAfuera||'si',puede_local:r.puedeLocal||'si',estado:r.estado||'Activo',obs:r.obs||''}; },
    congregaciones: function(c){ return {id:c.id,cong_id:cid,nombre:c.nombre||'',estado:c.estado||'Activa',direccion:c.direccion||'',dia:c.dia||'0',horario:c.horario||'',coord_nombre:c.coordNombre||'',coord_tel:c.coordTel||'',coord_email:c.coordEmail||'',obs:c.obs||''}; },
    privilegios: function(p){ return {id:p.id,cong_id:cid,nombre:p.nombre||''}; },
    planificacion: function(p){ return {id:p.id,cong_id:cid,tipo:p.tipo||'',origen:p._origen||'',hermano_id:p._hermanoId||null,fecha:p.fecha||'',congregacion:p.congregacion||'',hermano:p.hermano||'',num_discurso:p.numDiscurso?String(p.numDiscurso):'',titulo:p.titulo||'',confirmado:p.confirmado||'Por confirmar',obs:p.obs||''}; },
    historial: function(h){ return {id:h.id,cong_id:cid,fecha:h.fecha||'',tipo:h.tipo||'',congregacion:h.congregacion||'',hermano:h.hermano||'',hermano_id:h.hermanoId||null,telefono:h.telefono||'',num_discurso:h.numDiscurso?String(h.numDiscurso):'',titulo:h.titulo||'',obs:h.obs||''}; },
    salidasRealizadas: function(s){ return {id:s.id,cong_id:cid,fecha:s.fecha||'',congregacion:s.congregacion||'',hermano:s.hermano||'',hermano_id:s.hermanoId||null,num_discurso:s.numDiscurso?String(s.numDiscurso):'',titulo:s.titulo||'',obs:s.obs||''}; },
    cargaMensual: function(c){ return {id:c.id,cong_id:cid,congregacion:c.congregacion||'',hermano:c.hermano||'',num_discurso:c.numDiscurso?String(c.numDiscurso):'',telefono:c.telefono||'',mes:c.mes||null,anio:c.anio||null}; },
    arreglos: function(a){ return {id:a.id,cong_id:cid,mes:a.mes||null,anio:a.anio||null,congregacion_nombre:a.congregacion||'',tipo:a.tipo||'entrada',estado:a.estado||'pendiente',obs:a.obs||''}; },
  };
  return m[dKey] ? m[dKey](item) : item;
}

async function dbUpsertItem(dKey, item){
  var tbl = _COL[dKey]; if(!tbl) return;
  if(!item.id) item.id = uid();
  var row = _toRow(dKey, item);
  var res = await _sb.from(tbl).upsert(row, {onConflict:'id'});
  if(res.error) console.error('dbUpsertItem error', dKey, res.error.message);
}

async function dbDeleteItem(dKey, id){
  var tbl = _COL[dKey]; if(!tbl) return;
  var res = await _sb.from(tbl).delete().eq('id', id).eq('cong_id', _congId());
  if(res.error) console.error('dbDeleteItem error', dKey, res.error.message);
}

async function dbSaveDoc(field){
  var cid = _congId();
  if(field === 'miCongr'){
    var mc = D.miCongr;
    await _sb.from('congregaciones').update({
      direccion:mc.direccion||'',dia:mc.dia||'6',horario:mc.horario||'',
      maps_salon:mc.mapsSalon||'',coord_nombre:mc.coordNombre||'',
      coord_tel:mc.coordTel||'',coord_email:mc.coordEmail||'',
      av_nombre:mc.avNombre||'',av_tel:mc.avTel||'',av_email:mc.avEmail||'',obs:mc.obs||''
    }).eq('id', cid);
    toast('Guardado', 's');
  } else if(field === 'config'){
    var c = D.config;
    await _sb.from('config').upsert({
      cong_id:cid,mes:c.mes,anio:c.anio,
      congregacion_externa_mes:c.congregacionExternaMes||'',
      dias_bloqueo:c.diasBloqueo||365,
      discursos_locales_requeridos:c.discursosLocalesRequeridos||1,
      habra_salidas_mes:c.habraSalidasMes||'no',habra_sc_mes:c.habraSCMes||'no',
      sc_nombre:c.scNombre||'',sc_tel:c.scTel||'',sc_email:c.scEmail||'',sc_obs:c.scObs||'',
      plantilla_carta:c.plantillaCarta||'',plantilla_whatsapp:c.plantillaWhatsApp||''
    }, {onConflict:'cong_id'});
    toast('Guardado', 's');
  }
}

async function dbSaveArray(dKey){
  var tbl = _COL[dKey]; if(!tbl) return;
  var arr = D[dKey] || [];
  await _sb.from(tbl).delete().eq('cong_id', _congId());
  if(!arr.length) return;
  var rows = arr.map(function(item){ return _toRow(dKey, item); });
  for(var i = 0; i < rows.length; i += 100){
    var res = await _sb.from(tbl).insert(rows.slice(i, i + 100));
    if(res.error){ console.error('dbSaveArray error', dKey, res.error.message); return; }
  }
}

async function dbLoadAll(cb){
  if(!_congId()){ if(cb) cb(); return; }
  syncBar(true, 'Cargando datos...');
  try {
    var cid = _congId();
    var res = await Promise.all([
      _sb.from('congregaciones').select('*').eq('id', cid).single(),
      _sb.from('config').select('*').eq('cong_id', cid).maybeSingle(),
      _sb.from('discursos').select('*').eq('cong_id', cid),
      _sb.from('hermanos').select('*').eq('cong_id', cid),
      _sb.from('repertorio').select('*').eq('cong_id', cid),
      _sb.from('congregaciones_ext').select('*').eq('cong_id', cid),
      _sb.from('privilegios').select('*').eq('cong_id', cid),
      _sb.from('planificacion').select('*').eq('cong_id', cid),
      _sb.from('historial').select('*').eq('cong_id', cid),
      _sb.from('salidas').select('*').eq('cong_id', cid),
      _sb.from('carga_mensual').select('*').eq('cong_id', cid),
      _sb.from('arreglos').select('*').eq('cong_id', cid),
    ]);
    var mc = res[0].data, cfg = res[1].data;
    if(mc) D.miCongr = {nombre:mc.nombre||'',direccion:mc.direccion||'',dia:mc.dia||'6',horario:mc.horario||'',circuito:mc.circuito||'',mapsSalon:mc.maps_salon||'',coordNombre:mc.coord_nombre||'',coordTel:mc.coord_tel||'',coordEmail:mc.coord_email||'',avNombre:mc.av_nombre||'',avTel:mc.av_tel||'',avEmail:mc.av_email||'',obs:mc.obs||''};
    if(cfg) D.config = {mes:cfg.mes||new Date().getMonth()+1,anio:cfg.anio||new Date().getFullYear(),congregacionExternaMes:cfg.congregacion_externa_mes||'',diasBloqueo:cfg.dias_bloqueo||365,discursosLocalesRequeridos:cfg.discursos_locales_requeridos||1,habraSalidasMes:cfg.habra_salidas_mes||'no',habraSCMes:cfg.habra_sc_mes||'no',scNombre:cfg.sc_nombre||'',scTel:cfg.sc_tel||'',scEmail:cfg.sc_email||'',scObs:cfg.sc_obs||'',plantillaCarta:cfg.plantilla_carta||'',plantillaWhatsApp:cfg.plantilla_whatsapp||''};
    D.discursos = (res[2].data||[]).map(function(d){ return {id:d.id,numero:d.numero,titulo:d.titulo,estado:d.estado,obs:d.obs||''}; });
    D.locales = (res[3].data||[]).map(function(h){ return {id:h.id,nombre:h.nombre,nombramiento:h.nombramiento||'',telefono:h.telefono||'',puedeAfuera:h.puede_afuera||'si',puedeLocal:h.puede_local||'si',estado:h.estado||'Activo',obs:h.obs||'',privilegios:typeof h.privilegios==='string'?JSON.parse(h.privilegios||'[]'):(h.privilegios||[])}; });
    D.repertorioLocal = (res[4].data||[]).map(function(r){ return {id:r.id,hermanoId:r.hermano_id||'',numDiscurso:r.num_discurso,titulo:r.titulo||'',puedeAfuera:r.puede_afuera||'si',puedeLocal:r.puede_local||'si',estado:r.estado||'Activo',obs:r.obs||''}; });
    D.congregaciones = (res[5].data||[]).map(function(c){ return {id:c.id,nombre:c.nombre,estado:c.estado||'Activa',direccion:c.direccion||'',dia:c.dia||'0',horario:c.horario||'',coordNombre:c.coord_nombre||'',coordTel:c.coord_tel||'',coordEmail:c.coord_email||'',obs:c.obs||''}; });
    D.privilegios = (res[6].data||[]).map(function(p){ return {id:p.id,nombre:p.nombre}; });
    D.planificacion = (res[7].data||[]).map(function(p){ return {id:p.id,tipo:p.tipo||'',_origen:p.origen||'',_hermanoId:p.hermano_id||'',fecha:p.fecha||'',congregacion:p.congregacion||'',hermano:p.hermano||'',numDiscurso:p.num_discurso||'',titulo:p.titulo||'',confirmado:p.confirmado||'Por confirmar',obs:p.obs||''}; });
    D.historial = (res[8].data||[]).map(function(h){ return {id:h.id,fecha:h.fecha||'',tipo:h.tipo||'',congregacion:h.congregacion||'',hermano:h.hermano||'',hermanoId:h.hermano_id||'',telefono:h.telefono||'',numDiscurso:h.num_discurso||'',titulo:h.titulo||'',obs:h.obs||''}; });
    D.salidasRealizadas = (res[9].data||[]).map(function(s){ return {id:s.id,fecha:s.fecha||'',congregacion:s.congregacion||'',hermano:s.hermano||'',hermanoId:s.hermano_id||'',numDiscurso:s.num_discurso||'',titulo:s.titulo||'',obs:s.obs||''}; });
    D.cargaMensual = (res[10].data||[]).map(function(c){ return {id:c.id,congregacion:c.congregacion||'',hermano:c.hermano||'',numDiscurso:c.num_discurso||'',telefono:c.telefono||'',mes:c.mes,anio:c.anio}; });
    D.arreglos = (res[11].data||[]).map(function(a){
      // Buscar datos de la congregacion externa correspondiente
      var ce=D.congregaciones.find(function(c){return c.nombre&&a.congregacion_nombre&&c.nombre.toLowerCase()===a.congregacion_nombre.toLowerCase();});
      return {
        id:a.id,mes:a.mes,anio:a.anio,
        congregacion:a.congregacion_nombre||'',
        tipo:a.tipo||'entrada',estado:a.estado||'pendiente',obs:a.obs||'',
        congregacionId:a.congregacion_id||'',
        coordNombre:ce?ce.coordNombre||'':'',
        coordTel:ce?ce.coordTel||'':'',
        coordEmail:ce?ce.coordEmail||'':'',
        direccion:ce?ce.direccion||'':'',
        dia:ce?ce.dia||'0':'0',
        horario:ce?ce.horario||'':''
      };
    });
    if(!D.privilegios.length) D.privilegios = _privilegiosDefault.map(function(n){ return {id:uid(),nombre:n}; });
    syncBar(false);
    if(cb) cb();
  } catch(e) {
    console.error('dbLoadAll error:', e);
    syncBar(false);
    if(cb) cb();
  }
}

/* ── Auth State Listener ── */
_sb.auth.onAuthStateChange(function(event, session){
  if(!session){ mostrarLogin(); return; }
  _sb.from('usuarios').select('*').eq('email', session.user.email).maybeSingle()
    .then(function(res){
      if(!res.data || !res.data.activo){
        mostrarLogin();
        loginErr('No tienes acceso. Contacta al administrador.');
        _sb.auth.signOut();
        return;
      }
      _usr = {
        id: session.user.id,
        email: session.user.email,
        nombre: res.data.nombre || '',
        rol: res.data.rol || 'visor',
        cong_id: res.data.cong_id || ''
      };
      ocultarLogin();
      actualizarChip();
      aplicarRol();
      if(_usr.cong_id){
        dbLoadAll(function(){
          if(typeof initPagina === 'function') initPagina();
          else if(typeof renderDash === 'function') renderDash();
        });
      } else {
        if(typeof initPagina === 'function') initPagina();
      }
    });
});

/* ── Sidebar + Nav ── */
function initSidebar(){
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var toggle = document.getElementById('topbar-toggle');
  if(!sidebar || !toggle) return;

  // Evitar registrar el evento multiples veces
  if(toggle.dataset.sbInit) return;
  toggle.dataset.sbInit = '1';

  var collapsed = localStorage.getItem('sb_collapsed') === '1';
  if(collapsed && window.innerWidth > 900) sidebar.classList.add('collapsed');

  function toggleSidebar(){
    if(window.innerWidth <= 900){
      var open = sidebar.classList.contains('mobile-open');
      sidebar.classList.toggle('mobile-open', !open);
      if(overlay) overlay.classList.toggle('show', !open);
    } else {
      var col = sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', !col);
      localStorage.setItem('sb_collapsed', !col ? '1' : '0');
    }
  }

  // Click y touchend para mobile
  toggle.addEventListener('click', toggleSidebar);
  toggle.addEventListener('touchend', function(e){
    e.preventDefault();
    toggleSidebar();
  });

  function closeSidebar(){
    sidebar.classList.remove('mobile-open');
    if(overlay) overlay.classList.remove('show');
  }

  if(overlay){
    overlay.addEventListener('click', closeSidebar);
    overlay.addEventListener('touchend', function(e){
      e.preventDefault();
      closeSidebar();
    });
  }

  // Cerrar sidebar al hacer click en un nav-item en mobile
  sidebar.querySelectorAll('.nav-item').forEach(function(item){
    item.addEventListener('click', function(){
      if(window.innerWidth <= 900) closeSidebar();
    });
  });
}

function setNavActivo(pagina){
  document.querySelectorAll('.nav-item').forEach(function(el){
    el.classList.toggle('active', el.dataset.page === pagina);
  });
}

function setPageTitle(titulo, meta){
  var t = document.getElementById('page-title');
  var m = document.getElementById('page-meta');
  if(t) t.textContent = titulo || '';
  if(m) m.textContent = meta || '';
}
