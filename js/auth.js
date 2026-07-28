/* ============================================================
   auth.js — Autenticacion Firebase + control de roles
============================================================ */
var _usr=null;
var _invPendiente=null;
var _invLinkActual='';
var _privilegiosDefault=['Precursor Regular','Precursor Auxiliar','Precursor Especial','Pre-Grupo Romane'];
var _st={};

/* ── Modelo de datos ── */
var D={
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

/* ── Login ── */
function fbLoginGoogle(){
  fbLoginErr('');
  _auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
}
function fbCerrarSesion(){
  if(confirm('Cerrar sesion?')){_auth.signOut();location.href='../index.html';}
}
function fbLoginErr(msg){
  var el=document.getElementById('login-err');
  if(el)el.textContent=msg||'';
}

/* ── Chip usuario ── */
function fbActualizarChip(){
  var chip=document.getElementById('sb-user');
  if(!chip||!_usr)return;
  var rolLabel={superadmin:'Super Admin',admin:'Administrador',coordinador:'Coordinador',lector:'Lector',visor:'Visor'}[_usr.rol]||_usr.rol;
  chip.innerHTML=(_usr.foto?'<img src="'+_usr.foto+'" alt="">':'<div style="width:32px;height:32px;border-radius:50%;background:var(--pr);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0">'+(_usr.nombre||'U')[0]+'</div>')
    +'<div class="user-info"><div class="user-name">'+esc(_usr.nombre||'')+'</div><div class="user-role">'+esc(rolLabel)+'</div></div>';
}

/* ── Aplicar rol ── */
function fbAplicarRol(){
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

/* ── Procesar invitacion ── */
function fbProcesarInvitacion(token){
  _db.collection('invitaciones').doc(token).get().then(function(doc){
    if(!doc.exists){setTimeout(function(){toast('Invitacion no encontrada','e');},500);return;}
    var inv=doc.data();
    if(inv.usada){setTimeout(function(){toast('Esta invitacion ya fue usada','e');},500);return;}
    var ahora=new Date();
    var expira=inv.expiraEn?inv.expiraEn.toDate():null;
    if(expira&&ahora>expira){setTimeout(function(){toast('Esta invitacion ha expirado','e');},500);return;}
    if(inv.email&&inv.email.toLowerCase()!==(_usr.email||'').toLowerCase()){
      setTimeout(function(){toast('Esta invitacion es para '+inv.email,'e');},500);return;
    }
    _invPendiente={token:token,inv:inv};
    _db.collection('congregaciones').doc(inv.congId).get().then(function(cdoc){
      var congNombre=cdoc.exists?(cdoc.data().nombre||inv.congId):inv.congId;
      var circuito=cdoc.exists?(cdoc.data().circuito||''):'';
      var rolLabel={superadmin:'Super Administrador',admin:'Administrador',coordinador:'Coordinador',lector:'Lector',visor:'Visor'}[inv.rol]||inv.rol;
      var elN=document.getElementById('inv-congr-nombre');
      var elR=document.getElementById('inv-rol-label');
      if(elN)elN.textContent=congNombre;
      if(elR)elR.textContent='Tu rol: '+rolLabel;
      var elDatos=document.getElementById('inv-datos');
      if(elDatos){
        elDatos.innerHTML='<div class="inv-info-box">'
          +'<strong>Nombre:</strong> '+esc(congNombre)+'<br>'
          +(circuito?'<strong>Circuito:</strong> '+esc(circuito):'')
          +'</div>';
      }
      var overlay=document.getElementById('inv-overlay');
      if(overlay)overlay.classList.add('show');
    }).catch(function(){
      var overlay=document.getElementById('inv-overlay');
      if(overlay)overlay.classList.add('show');
    });
  }).catch(function(e){
    setTimeout(function(){toast('Error de conexion','e');},500);
  });
}

function invAceptar(){
  if(!_invPendiente)return;
  var inv=_invPendiente.inv,token=_invPendiente.token;
  var btn=document.getElementById('inv-aceptar-btn');
  if(btn){btn.disabled=true;btn.textContent='Procesando...';}
  _db.collection('usuarios').doc(_usr.email).set({
    email:_usr.email,
    nombre:_usr.nombre||inv.nombreInvitado||'',
    rol:inv.rol||'lector',
    congId:inv.congId||'',
    activo:true,
    creadoEn:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(){
    return _db.collection('invitaciones').doc(token).update({
      usada:true,
      usadaEn:firebase.firestore.FieldValue.serverTimestamp(),
      usadaPor:_usr.email
    });
  }).then(function(){
    _invPendiente=null;
    window.history.replaceState({},'',window.location.pathname);
    location.reload();
  }).catch(function(e){
    if(btn){btn.disabled=false;btn.textContent='Aceptar e ingresar';}
    toast('Error: '+e.message,'e');
  });
}

function invRechazar(){
  _invPendiente=null;
  var overlay=document.getElementById('inv-overlay');
  if(overlay)overlay.classList.remove('show');
  window.history.replaceState({},'',window.location.pathname);
  _auth.signOut();
  location.reload();
}

/* ── Auth state listener ── */
_auth.getRedirectResult().then(function(result){
  // Manejar resultado del redirect (login con Google)
}).catch(function(e){console.error('redirect error:',e);});

_auth.onAuthStateChanged(function(user){
  if(!user){
    mostrarLogin();
    return;
  }
  _db.collection('usuarios').doc(user.email).get().then(function(doc){
    var params=new URLSearchParams(window.location.search);
    var token=params.get('inv');
    if(!doc.exists||!doc.data().activo){
      if(token){
        _usr={email:user.email,nombre:user.displayName||'',rol:'pendiente',congId:'',foto:user.photoURL||''};
        ocultarLogin();
        setTimeout(function(){fbProcesarInvitacion(token);},800);
        return;
      }
      mostrarLogin();
      fbLoginErr('No tienes acceso. Solicita una invitacion al administrador.');
      _auth.signOut();
      return;
    }
    var data=doc.data();
    _usr={
      email:user.email,
      nombre:data.nombre||user.displayName||'',
      rol:data.rol||'visor',
      congId:data.congId||'',
      foto:user.photoURL||''
    };
    ocultarLogin();
    fbActualizarChip();
    fbAplicarRol();
    if(_usr.congId){
      dbLoadAll(function(){
        if(typeof initPagina==='function')initPagina();
      });
    }else{
      if(typeof initPagina==='function')initPagina();
    }
    var token=new URLSearchParams(window.location.search).get('inv');
    if(token)setTimeout(function(){fbProcesarInvitacion(token);},800);
  }).catch(function(e){
    console.error('Error verificando usuario:',e);
    mostrarLogin();
    fbLoginErr('Error de conexion. Intenta nuevamente.');
  });
});

function mostrarLogin(){
  var el=document.getElementById('login-overlay');
  if(el)el.classList.remove('hidden');
}
function ocultarLogin(){
  var el=document.getElementById('login-overlay');
  if(el)el.classList.add('hidden');
}
