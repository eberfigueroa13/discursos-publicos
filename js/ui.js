/* ============================================================
   ui.js — Componentes UI: toast, modal, sidebar, helpers
============================================================ */

/* ── Toast ── */
function toast(msg,tipo){
  var c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';document.body.appendChild(c);}
  var t=document.createElement('div');
  t.className='toast toast-'+(tipo||'i');
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(120%)';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3000);
}

/* ── Sync bar ── */
function syncBar(show,msg){
  var el=document.getElementById('sync-indicator');
  if(!el)return;
  if(show){
    el.classList.add('show');
    var lbl=el.querySelector('.sync-label');
    if(lbl)lbl.textContent=msg||'Sincronizando...';
  }else{
    el.classList.remove('show');
  }
}

/* ── Modal ── */
var _modalCb=null;
function openM(titulo,contenido,botonesArr){
  document.getElementById('modal-title').textContent=titulo;
  document.getElementById('modal-body').innerHTML=contenido;
  var footer=document.getElementById('modal-footer');
  footer.innerHTML='';
  var bots=botonesArr||[{l:'Cerrar',c:'btn-ghost',fn:closeM}];
  bots.forEach(function(b){
    var btn=document.createElement('button');
    btn.className='btn '+(b.c||'btn-ghost');
    btn.textContent=b.l;
    btn.onclick=b.fn||closeM;
    footer.appendChild(btn);
  });
  document.getElementById('modal-overlay').classList.add('show');
}
function closeM(){document.getElementById('modal-overlay').classList.remove('show');}
function confirmar(msg,cb){
  openM('Confirmar',
    '<p style="font-size:14px;color:var(--tx)">'+esc(msg)+'</p>',
    [{l:'Cancelar',c:'btn-ghost',fn:closeM},{l:'Confirmar',c:'btn-danger',fn:function(){closeM();cb();}}]
  );
}

/* ── Sidebar toggle ── */
function initSidebar(){
  var sidebar=document.getElementById('sidebar');
  var overlay=document.getElementById('sidebar-overlay');
  var toggle=document.getElementById('topbar-toggle');
  if(!sidebar||!toggle)return;

  // Estado guardado
  var collapsed=localStorage.getItem('sidebar_collapsed')==='1';
  if(collapsed&&window.innerWidth>900)sidebar.classList.add('collapsed');

  toggle.addEventListener('click',function(){
    if(window.innerWidth<=900){
      var isOpen=sidebar.classList.contains('mobile-open');
      sidebar.classList.toggle('mobile-open',!isOpen);
      if(overlay)overlay.classList.toggle('show',!isOpen);
    }else{
      var isCollapsed=sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed',!isCollapsed);
      localStorage.setItem('sidebar_collapsed',!isCollapsed?'1':'0');
    }
  });

  if(overlay){
    overlay.addEventListener('click',function(){
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }

  // Cerrar en mobile al navegar
  document.querySelectorAll('.nav-item').forEach(function(item){
    item.addEventListener('click',function(){
      if(window.innerWidth<=900){
        sidebar.classList.remove('mobile-open');
        if(overlay)overlay.classList.remove('show');
      }
    });
  });
}

/* ── Checkboxes bulk ── */
var _sel={};
function onChk(el){
  var t=el.dataset.t,id=el.dataset.id;
  if(!_sel[t])_sel[t]=[];
  if(el.checked){if(_sel[t].indexOf(id)<0)_sel[t].push(id);}
  else{_sel[t]=_sel[t].filter(function(x){return x!==id;});}
  actualizarBulkBar(t);
}
function selAll(t,el){
  if(!_sel[t])_sel[t]=[];
  document.querySelectorAll('[data-t="'+t+'"]').forEach(function(c){
    c.checked=el.checked;
    if(el.checked){if(_sel[t].indexOf(c.dataset.id)<0)_sel[t].push(c.dataset.id);}
  });
  if(!el.checked)_sel[t]=[];
  actualizarBulkBar(t);
}
function actualizarBulkBar(t){
  var bar=document.getElementById('bulk-bar-'+t);
  var cnt=document.getElementById('bulk-cnt-'+t);
  if(bar)bar.classList.toggle('show',(_sel[t]||[]).length>0);
  if(cnt)cnt.textContent=(_sel[t]||[]).length+' seleccionados';
}
function bulkClear(t){
  _sel[t]=[];
  document.querySelectorAll('[data-t="'+t+'"]').forEach(function(c){c.checked=false;});
  actualizarBulkBar(t);
}
function chkBox(t,id){
  return '<input type="checkbox" data-t="'+t+'" data-id="'+id+'" onchange="onChk(this)">';
}

/* ── Dispatch de acciones en tabla ── */
function dsp(el){
  var fn=el.dataset.fn,id=el.dataset.id;
  if(fn&&window[fn])window[fn](id);
}

/* ── Toggle area ── */
function toggleArea(id){
  var el=document.getElementById(id);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}

/* ── Nav activo ── */
function setNavActivo(pagina){
  document.querySelectorAll('.nav-item').forEach(function(item){
    item.classList.toggle('active',item.dataset.page===pagina);
  });
}

/* ── Page title ── */
function setPageTitle(titulo,meta){
  var t=document.getElementById('page-title');
  var m=document.getElementById('page-meta');
  if(t)t.textContent=titulo||'';
  if(m)m.textContent=meta||'';
}

/* ── Init modal close on overlay click ── */
document.addEventListener('DOMContentLoaded',function(){
  var overlay=document.getElementById('modal-overlay');
  if(overlay){
    overlay.addEventListener('click',function(e){
      if(e.target===overlay)closeM();
    });
  }
});
