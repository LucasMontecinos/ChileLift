/* ═══════════════════════════════════════════════════════════════════
   YourLift — Compat shim
   ═══════════════════════════════════════════════════════════════════
   data.json ahora usa el formato CANÓNICO NUEVO:
     categoria: '-83', '+120'
     division:  'Sub Junior', 'Junior', 'Open', 'Master 1'..'Master 4', 'Universitario', 'OE'
     sexo:      'Masculino' | 'Femenino'
     modalidad: 'classic', 'equipped', 'onlybench', 'classic_bench',
                'equipped_bench', 'oe_classic', 'universitario'

   Las páginas existentes esperan el formato VIEJO ('Hombre', 'Powerlifting Classic',
   '-83 kg (Hombre)', 'Master I'). Para no romperlas, este shim CONVIERTE
   los datos cargados de NUEVO -> VIEJO al momento de leerlos.

   El admin debe ESCRIBIR en formato NUEVO. Para eso usar las funciones
   __toCanon* expuestas más abajo.
   ════════════════════════════════════════════════════════════════════ */
(function(window){
  'use strict';

  // ── Mapeos NUEVO -> VIEJO (para back-compat con código existente) ──
  const MOD_NEW_TO_OLD = {
    'classic':         'Powerlifting Classic',
    'equipped':        'Powerlifting Equipado',
    'onlybench':       'Only Bench Classic',
    'classic_bench':   'Powerlifting Classic + Only Bench Classic',
    'equipped_bench':  'Powerlifting Equipado + Only Bench Equipado',
    'oe_classic':      'Powerlifting Classic Special Olympics',
    'universitario':   'Powerlifting Classic Universitario'
  };

  const DIV_NEW_TO_OLD = {
    'Master 1':'Master I','Master 2':'Master II','Master 3':'Master III','Master 4':'Master IV'
  };

  // sexo: el código existente acepta ambos 'Hombre' y 'Masculino' en la mayoría de lugares.
  // Para máxima compatibilidad mantenemos 'Masculino'/'Femenino' que ya funcionan.

  // ── Conversor de una competencia NUEVO -> VIEJO ──────────────────
  function competenciaNewToOld(c){
    if (!c || typeof c !== 'object') return c;
    var sex = c.sexo || '';
    // Categoria: '-83' -> '-83 kg (Hombre)' (formato viejo con sexo embebido)
    if (c.categoria && /^[+-]?\d+\+?$/.test(c.categoria)){
      var sexoLabel = (sex === 'Femenino' || sex === 'Mujer' || sex === 'F') ? 'Mujer' : 'Hombre';
      // Si empieza con + significa "categoría plus" (ej. "+84")
      var catNumPart = c.categoria.startsWith('+') ? c.categoria.slice(1)+'+' : c.categoria;
      c.categoria = catNumPart + ' kg ('+sexoLabel+')';
    }
    if (c.modalidad && MOD_NEW_TO_OLD[c.modalidad]) c.modalidad = MOD_NEW_TO_OLD[c.modalidad];
    if (c.division && DIV_NEW_TO_OLD[c.division]) c.division = DIV_NEW_TO_OLD[c.division];
    return c;
  }

  // ── Aplica conversión a todo el array de atletas ──────────────────
  // Llamar inmediatamente después de fetch('data.json').then(r=>r.json())
  function normalizeDataJsonForLegacy(data){
    if (!Array.isArray(data)) return data;
    for (var i=0; i<data.length; i++){
      var a = data[i];
      if (a && Array.isArray(a.competencias)){
        for (var j=0; j<a.competencias.length; j++){
          competenciaNewToOld(a.competencias[j]);
        }
      }
    }
    return data;
  }

  // ── Conversor VIEJO -> CANÓNICO NUEVO (para escribir datos limpios) ──
  function toCanonModalidad(m){
    if (!m) return '';
    var s = String(m).toLowerCase().replace(/\+/g,' + ').replace(/\s+/g,' ').trim();
    if (s.indexOf('special olympics')>=0 || s.indexOf('olimpiad')>=0 || s.indexOf('(oe)')>=0) return 'oe_classic';
    if (s.indexOf('universit')>=0) return 'universitario';
    var eq = (s.indexOf('equipado')>=0 || s.indexOf('equipped')>=0);
    var pl = (s.indexOf('powerlifting')>=0);
    var ob = (s.indexOf('only bench')>=0);
    if (eq && pl && ob) return 'equipped_bench';
    if (eq && ob)       return 'onlybench';
    if (eq)             return 'equipped';
    if (pl && ob)       return 'classic_bench';
    if (ob)             return 'onlybench';
    if (pl)             return 'classic';
    // si ya viene como código corto, devolverlo tal cual
    if (['classic','equipped','onlybench','classic_bench','equipped_bench','oe_classic','universitario'].indexOf(s)>=0) return s;
    return s;
  }

  function toCanonSexo(s){
    if (!s) return '';
    var x = String(s).trim().toLowerCase();
    if (x.startsWith('hom') || x.startsWith('mas') || x==='m') return 'Masculino';
    if (x.startsWith('muj') || x.startsWith('fem') || x==='f') return 'Femenino';
    return s;
  }

  function toCanonCategoria(c){
    if (!c) return '';
    var s = String(c).trim().replace(/\s*kg\s*/i,'').replace(/\s*\(.*?\)\s*/,'').trim();
    var m = s.match(/^(\d+)\+$/);
    if (m) return '+' + m[1];
    if (s.startsWith('+') || s.startsWith('-')) return s;
    if (/^\d+$/.test(s)) return '-' + s;
    return s;
  }

  function toCanonDivision(d){
    if (!d) return '';
    var s = String(d).trim();
    var sl = s.toLowerCase().replace(/-/g,'').replace(/\s/g,'');
    if (['subjunior','sub','subj'].indexOf(sl)>=0) return 'Sub Junior';
    if (sl==='junior' || sl==='junioer') return 'Junior';
    if (sl==='open') return 'Open';
    if (['master','masteri','master1'].indexOf(sl)>=0) return 'Master 1';
    if (['masterii','master2'].indexOf(sl)>=0) return 'Master 2';
    if (['masteriii','master3'].indexOf(sl)>=0) return 'Master 3';
    if (['masteriv','master4'].indexOf(sl)>=0) return 'Master 4';
    if (sl==='universitario' || sl==='university') return 'Universitario';
    if (sl==='oe') return 'OE';
    return s;
  }

  // Expose
  window.__ylNormalizeDataJsonForLegacy = normalizeDataJsonForLegacy;
  window.__ylToCanonModalidad = toCanonModalidad;
  window.__ylToCanonSexo      = toCanonSexo;
  window.__ylToCanonCategoria = toCanonCategoria;
  window.__ylToCanonDivision  = toCanonDivision;

})(window);
