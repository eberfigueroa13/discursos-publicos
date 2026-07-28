/* ============================================================
   auth.js — Autenticacion Supabase (email + password)
============================================================ */
var _usr = null;
var _privilegiosDefault = ['Precursor Regular','Precursor Auxiliar','Precursor Especial','Pre-Grupo Romane'];
var _st = {};

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

/* ── Login ── */
async function doLogin(){
  const email = document.getElementById('login-email')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value;
  if(!email||!pass){ loginErr('Ingresa tu email y contraseña'); return; }
  loginErr('');
  const btn = document.getElementById('login-btn');
  if(btn){ btn.disabled=true; btn.textContent='Ingresando...'; }
  const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
  if(error){
    loginErr('Email o contraseña incorrectos');
    if(btn){ btn.disabled=false; btn.textContent='Ingresar'; }
    return;
  }
}

async function doLogout(){
  if(!confirm('Cerrar sesion?')) return;
  await _sb.auth.signOut();
  window.location.href = '/index.html';
}

function loginErr(msg){
  const el = document.getElementById('login-err');
  if(el) el.textContent = msg||'';
}

async function doResetPassword(){
  const email = document.getElementById('login-email')?.value?.trim();
  if(!email){ loginErr('Ingresa tu email primero'); return; }
  const { error } = await _sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/pages/nueva-password.html'
  });
  if(error){ loginErr('Error: ' + error.message); return; }
  loginErr('');
  toast('Se envió un email para restablecer tu contraseña', 's');
}

/* ── Chip de usuario en sidebar ── */
function actualizarChip(){
  const chip = document.getElementById('sb-user');
  if(!chip||!_usr) return;
  const roles = {superadmin:'Super Admin',admin:'Administrador',coordinador:'Coordinador',lector:'Lector',visor:'Visor'};
  chip.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:var(--pr);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0">${((_usr.nombre||'U')[0]).toUpperCase()}</div>
    <div class="user-info"><div class="user-name">${esc(_usr.nombre||'')}</div><div class="user-role">${esc(roles[_usr.rol]||_usr.rol)}</div></div>`;
}

/* ── Aplicar rol ── */
function aplicarRol(){
  if(!_usr) return;
  const esSA = _usr.rol==='superadmin';
  const esAdmin = _usr.rol==='admin'||esSA;
  const esCoord = _usr.rol==='coordinador'||esAdmin;
  const esLector = _usr.rol==='lector'||esCoord;
  document.querySelectorAll('[data-roles]').forEach(el => {
    const roles = el.dataset.roles.split(',');
    const visible = roles.some(r => {
      if(r==='superadmin') return esSA;
      if(r==='admin') return esAdmin;
      if(r==='coordinador') return esCoord;
      if(r==='lector') return esLector;
      return true;
    });
    el.style.display = visible ? '' : 'none';
  });
}

/* ── Mostrar/ocultar login ── */
function mostrarLogin(){
  const el = document.getElementById('login-overlay');
  if(el) el.classList.remove('hidden');
}
function ocultarLogin(){
  const el = document.getElementById('login-overlay');
  if(el) el.classList.add('hidden');
}

/* ── Auth state listener ── */
_sb.auth.onAuthStateChange(async (event, session) => {
  if(!session){
    mostrarLogin();
    return;
  }
  // Buscar datos del usuario en tabla usuarios
  const { data: userData, error } = await _sb.from('usuarios')
    .select('*').eq('email', session.user.email).single();

  if(error || !userData || !userData.activo){
    mostrarLogin();
    loginErr('No tienes acceso. Contacta al administrador.');
    await _sb.auth.signOut();
    return;
  }

  _usr = {
    id: session.user.id,
    email: session.user.email,
    nombre: userData.nombre||'',
    rol: userData.rol||'visor',
    cong_id: userData.cong_id||''
  };

  ocultarLogin();
  actualizarChip();
  aplicarRol();

  if(_usr.cong_id){
    await dbLoadAll(function(){
      if(typeof initPagina === 'function') initPagina();
    });
  } else {
    if(typeof initPagina === 'function') initPagina();
  }
});
