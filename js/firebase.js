/* ============================================================
   firebase.js — Configuracion Firebase + DB Layer
============================================================ */
var _fbConfig={
  apiKey:"AIzaSyDIx3N3aXVB6JamMw3_9CtGj_46fv2eTik",
  authDomain:"coordinador-discursos-publicos.firebaseapp.com",
  projectId:"coordinador-discursos-publicos",
  storageBucket:"coordinador-discursos-publicos.firebasestorage.app",
  messagingSenderId:"919110251829",
  appId:"1:919110251829:web:0f07291d212988a9a0487c"
};
firebase.initializeApp(_fbConfig);
var _auth=firebase.auth();
var _db=firebase.firestore();

/* ── Mapeo colecciones ── */
var _COL={
  discursos:'discursos',
  locales:'hermanos',
  repertorioLocal:'repertorio',
  congregaciones:'congregacionesExt',
  cargaMensual:'cargaMensual',
  planificacion:'planificacion',
  historial:'historial',
  salidasRealizadas:'salidas',
  privilegios:'privilegios',
  arreglos:'arreglos'
};

/* ── Referencias ── */
function dbColRef(col){
  return _db.collection('congregaciones').doc(_usr.congId).collection(col);
}
function dbDocRef(field){
  return _db.collection('congregaciones').doc(_usr.congId).collection(field).doc('datos');
}

/* ── CRUD ── */
function dbUpsertItem(dKey,item,cb){
  if(!_usr||!_usr.congId)return;
  var col=_COL[dKey];if(!col)return;
  var id=(item.id||uid()).toString();
  if(!item.id)item.id=id;
  dbColRef(col).doc(id).set(JSON.parse(JSON.stringify(item)))
    .then(function(){if(cb)cb();})
    .catch(function(e){console.error('dbUpsertItem error',dKey,e);toast('Error al guardar','e');});
}
function dbDeleteItem(dKey,id,cb){
  if(!_usr||!_usr.congId)return;
  var col=_COL[dKey];if(!col)return;
  dbColRef(col).doc(id.toString()).delete()
    .then(function(){if(cb)cb();})
    .catch(function(e){console.error('dbDeleteItem error',dKey,e);toast('Error al eliminar','e');});
}
function dbSaveDoc(field,cb){
  if(!_usr||!_usr.congId)return;
  dbDocRef(field).set(JSON.parse(JSON.stringify(D[field]||{})))
    .then(function(){if(cb)cb();})
    .catch(function(e){console.error('dbSaveDoc error',field,e);toast('Error al guardar','e');});
}
function dbSaveArray(dKey,cb){
  if(!_usr||!_usr.congId)return;
  var col=_COL[dKey];if(!col)return;
  var arr=D[dKey]||[];
  dbColRef(col).get().then(function(snap){
    var batch=_db.batch();
    snap.docs.forEach(function(doc){batch.delete(doc.ref);});
    return batch.commit();
  }).then(function(){
    var chunks=[];
    for(var i=0;i<arr.length;i+=400)chunks.push(arr.slice(i,i+400));
    if(!chunks.length){if(cb)cb();return;}
    var p=Promise.resolve();
    chunks.forEach(function(chunk){
      p=p.then(function(){
        var b=_db.batch();
        chunk.forEach(function(item){
          b.set(dbColRef(col).doc((item.id||uid()).toString()),JSON.parse(JSON.stringify(item)));
        });
        return b.commit();
      });
    });
    return p;
  }).then(function(){if(cb)cb();})
  .catch(function(e){console.error('dbSaveArray error',dKey,e);toast('Error al guardar','e');});
}

/* ── Cargar todo ── */
function dbLoadAll(cb){
  if(!_usr||!_usr.congId){if(cb)cb();return;}
  syncBar(true,'Cargando datos...');
  var congRef=_db.collection('congregaciones').doc(_usr.congId);
  Promise.all([
    congRef.collection('miCongr').doc('datos').get(),
    congRef.collection('config').doc('datos').get(),
    congRef.collection('discursos').get(),
    congRef.collection('hermanos').get(),
    congRef.collection('repertorio').get(),
    congRef.collection('congregacionesExt').get(),
    congRef.collection('cargaMensual').get(),
    congRef.collection('planificacion').get(),
    congRef.collection('historial').get(),
    congRef.collection('salidas').get(),
    congRef.collection('privilegios').get(),
    congRef.collection('arreglos').get(),
  ]).then(function(r){
    syncBar(false);
    if(r[0].exists)D.miCongr=Object.assign(D.miCongr,r[0].data());
    if(r[1].exists)D.config=Object.assign(D.config,r[1].data());
    D.discursos=r[2].docs.map(function(d){return d.data();});
    D.locales=r[3].docs.map(function(d){return d.data();});
    D.repertorioLocal=r[4].docs.map(function(d){return d.data();});
    D.congregaciones=r[5].docs.map(function(d){return d.data();});
    D.cargaMensual=r[6].docs.map(function(d){return d.data();});
    D.planificacion=r[7].docs.map(function(d){return d.data();});
    D.historial=r[8].docs.map(function(d){return d.data();});
    D.salidasRealizadas=r[9].docs.map(function(d){return d.data();});
    D.privilegios=r[10].docs.map(function(d){return d.data();});
    D.arreglos=r[11].docs.map(function(d){return d.data();});
    dbMigrar();
    if(cb)cb();
  }).catch(function(e){
    syncBar(false);
    console.error('dbLoadAll error:',e);
    if(cb)cb();
  });
}

/* ── Migraciones ── */
function dbMigrar(){
  if(!D.config)D.config={};
  ['habraSalidasMes','habraSCMes'].forEach(function(k){if(D.config[k]===undefined)D.config[k]='no';});
  ['scNombre','scTel','scEmail','scObs','plantillaCarta','plantillaWhatsApp'].forEach(function(k){if(D.config[k]===undefined)D.config[k]='';});
  ['circuito','mapsSalon','avNombre','avTel','avEmail'].forEach(function(k){if(D.miCongr[k]===undefined)D.miCongr[k]='';});
  if(!D.privilegios||!D.privilegios.length)
    D.privilegios=_privilegiosDefault.map(function(n){return{id:uid(),nombre:n};});
  (D.locales||[]).forEach(function(h){if(!h.privilegios)h.privilegios=[];});
  (D.salidasRealizadas||[]).forEach(function(s){
    if(!s.hermanoId&&s.hermano){
      var h=D.locales.find(function(x){return normName(x.nombre)===normName(s.hermano);});
      if(h)s.hermanoId=h.id;
    }
  });
  if(!D.arreglos)D.arreglos=[];
  (D.arreglos||[]).forEach(function(a){if(typeof normalizarArreglo==='function')normalizarArreglo(a);});
  (D.congregaciones||[]).forEach(function(c){
    if(!c.coordNombre)c.coordNombre=c.contacto||'';
    if(!c.coordTel)c.coordTel=c.telefono||'';
    if(!c.coordEmail)c.coordEmail='';
    if(!c.direccion)c.direccion='';
    if(c.dia===undefined||c.dia===null||c.dia==='')c.dia='0';
    if(!c.horario)c.horario='';
  });
}

/* ── Importar JSON completo ── */
function dbImportarJSON(jsonStr,cb){
  if(!_usr||!_usr.congId){toast('Sin sesion activa','e');return;}
  var d;
  try{d=JSON.parse(jsonStr);}catch(e){toast('JSON invalido','e');return;}
  syncBar(true,'Importando datos...');
  var congRef=_db.collection('congregaciones').doc(_usr.congId);
  var ops=[];
  if(d.miCongr)ops.push(congRef.collection('miCongr').doc('datos').set(d.miCongr));
  if(d.config)ops.push(congRef.collection('config').doc('datos').set(d.config));
  Object.keys(_COL).forEach(function(dKey){
    var col=_COL[dKey];
    var arr=d[dKey]||[];
    for(var i=0;i<arr.length;i+=400){
      var chunk=arr.slice(i,i+400);
      var batch=_db.batch();
      chunk.forEach(function(item){
        if(!item.id)item.id=uid();
        batch.set(congRef.collection(col).doc(item.id.toString()),JSON.parse(JSON.stringify(item)));
      });
      ops.push(batch.commit());
    }
  });
  Promise.all(ops).then(function(){
    syncBar(false);
    toast('Importacion completada','s');
    setTimeout(function(){location.reload();},1000);
    if(cb)cb();
  }).catch(function(e){
    syncBar(false);
    toast('Error al importar: '+e.message,'e');
    console.error(e);
  });
}

/* ── Listener tiempo real ── */
var _fbUnsubscribe=null;
function dbIniciarListener(){
  if(!_usr||!_usr.congId)return;
  if(_fbUnsubscribe)_fbUnsubscribe();
  _fbUnsubscribe=_db.collection('congregaciones').doc(_usr.congId)
    .collection('config').doc('datos')
    .onSnapshot(function(doc){
      // Recargar datos si cambian desde otro dispositivo
      if(!doc.metadata.hasPendingWrites){
        dbLoadAll(function(){
          if(typeof renderPaginaActual==='function')renderPaginaActual();
        });
      }
    },function(e){console.error('listener error:',e);});
}
