/* ============================================================
   utils.js — Funciones utilitarias globales
============================================================ */
function uid(){return Math.random().toString(36).substr(2,9)+Date.now().toString(36);}
function esc(v){return(v||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function normName(v){return(v||'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function nMes(n){return['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(n)]||'';}
function nomDia(d){return['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'][parseInt(d)]||'';}
function fmtF(f){if(!f)return'---';var p=f.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:f;}
function normFecha(v){
  if(!v)return'';
  v=v.toString().trim();
  var m;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
  if((m=v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)))return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return v;
}
function fechasMes(mes,anio,diaSemana){
  var d=parseInt(diaSemana),fechas=[];
  var fecha=new Date(anio,mes-1,1);
  while(fecha.getDay()!==d)fecha.setDate(fecha.getDate()+1);
  while(fecha.getMonth()===mes-1){
    var y=fecha.getFullYear(),m=String(fecha.getMonth()+1).padStart(2,'0'),dd=String(fecha.getDate()).padStart(2,'0');
    fechas.push(y+'-'+m+'-'+dd);
    fecha.setDate(fecha.getDate()+7);
  }
  return fechas;
}
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
  return c.anio+'-'+String(c.mes).padStart(2,'0')+'-01T00:00:00';
}
function uniq(arr){return arr.filter(function(v,i,a){return a.indexOf(v)===i;});}
function ordenar(arr,ns,campo,dir){
  if(!_st)return arr;
  var key=ns+'_'+campo;
  if(_st[key]===undefined)_st[key]=1;
  return arr.slice().sort(function(a,b){
    var va=a[campo]||'',vb=b[campo]||'';
    if(typeof va==='number')return _st[key]*(va-vb);
    return _st[key]*(va+'').localeCompare(vb+'');
  });
}
function safeUrl(u){if(!u)return'';try{var x=new URL(u.startsWith('http')?u:'https://'+u);if(x.protocol==='https:'||x.protocol==='http:')return x.href;}catch(e){}return'';}
