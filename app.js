// =======================
// Helpers
// =======================

// ===============================
// SISTEMA DE LOGIN
// ===============================

// Crear credenciales por defecto si no existen
if (!localStorage.getItem("credenciales")) {
  localStorage.setItem("credenciales", JSON.stringify({
    usuario: "eoi",
    password: "eoi"
  }));
}

// Intentos fallidos
if (!localStorage.getItem("intentosLogin")) {
  localStorage.setItem("intentosLogin", "0");
}

// Bloqueo
if (!localStorage.getItem("bloqueadoHasta")) {
  localStorage.setItem("bloqueadoHasta", "0");
}

if (localStorage.getItem("sesionActiva") === "1") {
  mostrarApp();
} else {
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("app").style.display = "none";
}

function mostrarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
}

document.getElementById("togglePass").addEventListener("click", () => {
  const pass = document.getElementById("loginPass");
  pass.type = pass.type === "password" ? "text" : "password";
});

document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("sesionActiva");
  mostrarLogin();
});



document.getElementById("btnLogin").addEventListener("click", () => {
  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();
  const cred = JSON.parse(localStorage.getItem("credenciales"));

  const ahora = Date.now();
  const bloqueadoHasta = parseInt(localStorage.getItem("bloqueadoHasta"));

  // Comprobar bloqueo
  if (ahora < bloqueadoHasta) {
    loginBlocked.style.display = "block";
    return;
  }

  if (user === cred.usuario && pass === cred.password) {
    // Login correcto
    localStorage.setItem("intentosLogin", "0");

    if (recordarme.checked) {
      localStorage.setItem("sesionActiva", "1");
    }

    mostrarApp();
  } else {
    // Login incorrecto
    let intentos = parseInt(localStorage.getItem("intentosLogin")) + 1;
    localStorage.setItem("intentosLogin", intentos);

    loginError.style.display = "block";

    if (intentos >= 5) {
      const bloqueo = Date.now() + 5 * 60 * 1000; // 5 minutos
      localStorage.setItem("bloqueadoHasta", bloqueo);
      loginBlocked.style.display = "block";
    }
  }
});

// (login handled above)

function load(key, def) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
  } catch (e) {
    return def;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

// =======================
// Estado
// =======================
let grupos = load("grupos", []);
let alumnos = load("alumnos", []);
let asignaturas = load("asignaturas", null);
let pruebasPorGrupo = load("pruebasPorGrupo", {}); // {grupoId:{asigId:{semestre:[{id,nombre,peso}]}}}
let notas = load("notas", []); // [{grupoId,semestre,alumnoId,notas:{asigId:{pruebaId:valor}}}]

if (!asignaturas) {
  asignaturas = [
    { id: "CTO", nombre: "CTO" },
    { id: "CTE", nombre: "CTE" },
    { id: "PCTE", nombre: "PCTE" },
    { id: "PCO", nombre: "PCO" },
    { id: "MED", nombre: "MED" }
  ];
  save("asignaturas", asignaturas);
}

// =======================
// Tabs
// =======================
document.querySelectorAll(".md-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".md-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// =======================
// Utilidades
// =======================
function getPruebas(grupoId, asigId, semestre) {
  if (!pruebasPorGrupo[grupoId]) pruebasPorGrupo[grupoId] = {};
  if (!pruebasPorGrupo[grupoId][asigId]) pruebasPorGrupo[grupoId][asigId] = {};
  if (!pruebasPorGrupo[grupoId][asigId][semestre]) pruebasPorGrupo[grupoId][asigId][semestre] = [];
  return pruebasPorGrupo[grupoId][asigId][semestre];
}

function calcularMediaPruebas(pruebas, valores) {
  if (!pruebas || pruebas.length === 0) return "";
  let suma = 0;
  let totalPeso = 0;
  pruebas.forEach(p => {
    let v = parseFloat(valores[p.id]);
    if (!isNaN(v)) {
      suma += v * (p.peso / 100);
      totalPeso += p.peso;
    }
  });
  if (totalPeso === 0) return "";
  return suma.toFixed(1);
}

function aplicarColorElemento(el, valor) {
  el.classList.remove("nota-verde", "nota-roja");
  const v = parseFloat(valor);
  if (isNaN(v)) return;
  if (v >= 5) el.classList.add("nota-verde");
  else el.classList.add("nota-roja");
}

function mediaSinCeros(lista) {
  const nums = lista.filter(n => !isNaN(n) && n > 0);
  if (!nums.length) return "";
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  return m.toFixed(2);
}

function alumnosDeGrupoActivos(grupoId, semestre) {
  return alumnos.filter(a => a.grupoId === grupoId && (semestre === "1" ? a.activo1 : a.activo2));
}

// =======================
// Grupos
// =======================
const formGrupo = document.getElementById("formGrupo");
const tablaGrupos = document.getElementById("tablaGrupos");
const selGrupoAlumno = document.getElementById("grupoAlumno");
const selGrupoPruebas = document.getElementById("grupoPruebas");
const selGrupoNotas = document.getElementById("grupoNotas");
const selGrupoMedias = document.getElementById("grupoMedias");

function refrescarSelectGrupos() {
  [selGrupoAlumno, selGrupoPruebas, selGrupoNotas, selGrupoMedias].forEach(sel => {
    if (!sel) return;
    sel.innerHTML = "";
    grupos.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.nombre;
      sel.appendChild(opt);
    });
  });
}

function pintarGrupos() {
  tablaGrupos.innerHTML = "";
  grupos.forEach(g => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.nombre}</td>
      <td>
        <button class="md-button btn-small" data-accion="editar" data-id="${g.id}">Editar</button>
        <button class="md-button btn-small" data-accion="eliminar" data-id="${g.id}">Eliminar</button>
      </td>
    `;
    tablaGrupos.appendChild(tr);
  });
}

formGrupo.addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nombreGrupo").value.trim();
  if (!nombre) return;

  const nuevoGrupo = { id: genId("g"), nombre };
  grupos.push(nuevoGrupo);
  save("grupos", grupos);

  // ============================================
  // CREAR P1 y P2 (50% cada una) PARA TODAS LAS ASIGNATURAS
  // ============================================
  if (!pruebasPorGrupo[nuevoGrupo.id]) pruebasPorGrupo[nuevoGrupo.id] = {};

  asignaturas.forEach(asig => {
    if (!pruebasPorGrupo[nuevoGrupo.id][asig.id])
      pruebasPorGrupo[nuevoGrupo.id][asig.id] = {};

    // Semestres 1 y 2
    ["1", "2"].forEach(sem => {
      pruebasPorGrupo[nuevoGrupo.id][asig.id][sem] = [
        { id: genId("p"), nombre: "P1", peso: 50 },
        { id: genId("p"), nombre: "P2", peso: 50 }
      ];
    });
  });

  save("pruebasPorGrupo", pruebasPorGrupo);
  // ============================================

  document.getElementById("nombreGrupo").value = "";
  refrescarSelectGrupos();
  pintarGrupos();
});


tablaGrupos.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const accion = btn.dataset.accion;
  const g = grupos.find(x => x.id === id);
  if (!g) return;

  if (accion === "editar") {
    const nuevo = prompt("Nuevo nombre del grupo:", g.nombre);
    if (nuevo && nuevo.trim()) {
      g.nombre = nuevo.trim();
      save("grupos", grupos);
      refrescarSelectGrupos();
      pintarGrupos();
    }
  } else if (accion === "eliminar") {
    if (!confirm("¿Eliminar grupo y todos sus datos asociados?")) return;
    grupos = grupos.filter(x => x.id !== id);
    alumnos = alumnos.filter(a => a.grupoId !== id);
    notas = notas.filter(n => n.grupoId !== id);
    delete pruebasPorGrupo[id];
    save("grupos", grupos);
    save("alumnos", alumnos);
    save("notas", notas);
    save("pruebasPorGrupo", pruebasPorGrupo);
    refrescarSelectGrupos();
    pintarGrupos();
    pintarAlumnos();
  }
});

// =======================
// Alumnos
// =======================
const formAlumno = document.getElementById("formAlumno");
const tablaAlumnos = document.getElementById("tablaAlumnos");
const selActivo1 = document.getElementById("activo1Alumno");
const selActivo2 = document.getElementById("activo2Alumno");
const selComentarios = document.getElementById("comentariosAlumnos");

function pintarAlumnos() {
  tablaAlumnos.innerHTML = "";

  const grupoSel = selGrupoAlumno.value;

  alumnos
    .filter(a => !grupoSel || a.grupoId === grupoSel)
    .forEach(a => {
      const tr = document.createElement("tr");

      // Construir combo de grupos
      let opcionesGrupo = "";
      grupos.forEach(g => {
        opcionesGrupo += `<option value="${g.id}" ${g.id === a.grupoId ? "selected" : ""}>${g.nombre}</option>`;
      });

      tr.innerHTML = `
        <td>
          <input type="text" class="edit-nombre" data-id="${a.id}" value="${a.nombre}" style="width:100%;">
        </td>

        <td>
          <select class="edit-grupo" data-id="${a.id}" style="width:100%;">
            ${opcionesGrupo}
          </select>
        </td>

        <td>
          1ª ev: <input type="checkbox" class="edit-act1" data-id="${a.id}" ${a.activo1 ? "checked" : ""}>
        </td>

        <td>
          2ª ev: <input type="checkbox" class="edit-act2" data-id="${a.id}" ${a.activo2 ? "checked" : ""}>
        </td>

        <td>
          <textarea 
            class="edit-comentarios" 
            data-id="${a.id}" 
            style="width:100%; min-height:50px; resize:vertical;"
          >${a.comentarios || ""}</textarea>
        </td>

        <td>
          <button class="md-button btn-small" data-accion="eliminar" data-id="${a.id}">Eliminar</button>
        </td>
      `;

      tablaAlumnos.appendChild(tr);
    });

  activarEdicionAlumnos();
}

function activarEdicionAlumnos() {

  // Editar nombre
  document.querySelectorAll(".edit-nombre").forEach(inp => {
    inp.addEventListener("blur", () => {
      const a = alumnos.find(x => x.id === inp.dataset.id);
      if (!a) return;
      a.nombre = inp.value.trim();
      save("alumnos", alumnos);
    });
  });

  // Editar grupo
  document.querySelectorAll(".edit-grupo").forEach(sel => {
    sel.addEventListener("change", () => {
      const a = alumnos.find(x => x.id === sel.dataset.id);
      if (!a) return;
      a.grupoId = sel.value;
      save("alumnos", alumnos);
      pintarAlumnos(); // refrescar para actualizar filtro si está activo
    });
  });

  // Editar activo 1º
  document.querySelectorAll(".edit-act1").forEach(chk => {
    chk.addEventListener("change", () => {
      const a = alumnos.find(x => x.id === chk.dataset.id);
      if (!a) return;
      a.activo1 = chk.checked;
      save("alumnos", alumnos);
    });
  });

  // Editar activo 2º
  document.querySelectorAll(".edit-act2").forEach(chk => {
    chk.addEventListener("change", () => {
      const a = alumnos.find(x => x.id === chk.dataset.id);
      if (!a) return;
      a.activo2 = chk.checked;
      save("alumnos", alumnos);
    });
  });

  // Editar comentarios
  document.querySelectorAll(".edit-comentarios").forEach(txt => {
    txt.addEventListener("blur", () => {
      const a = alumnos.find(x => x.id === txt.dataset.id);
      if (!a) return;
      a.comentarios = txt.value.trim();
      save("alumnos", alumnos);
    });
  });
}


function activarGuardadoComentarios() {
  const cajas = document.querySelectorAll(".comentarios-alumno");

  cajas.forEach(caja => {
    caja.addEventListener("blur", () => {
      const id = caja.dataset.id;
      const alumno = alumnos.find(a => a.id === id);
      if (!alumno) return;

      alumno.comentarios = caja.value.trim();
      save("alumnos", alumnos);
    });
  });
}


selGrupoAlumno.addEventListener("change", () => {
  pintarAlumnos();
});


formAlumno.addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nombreAlumno").value.trim();
  const grupoId = selGrupoAlumno.value;
  const activo1 = selActivo1.value === "true";
  const activo2 = selActivo2.value === "true";
  if (!nombre || !grupoId) return;
  alumnos.push({
    id: genId("al"),
    nombre,
    grupoId,
    activo1,
    activo2,
    comentarios: ""
  });
  save("alumnos", alumnos);
  document.getElementById("nombreAlumno").value = "";
  pintarAlumnos();
});

tablaAlumnos.addEventListener("click", e => {
  if (!e.target.matches("button[data-accion='eliminar']")) return;

  const id = e.target.dataset.id;
  if (!confirm("¿Eliminar alumno y sus notas?")) return;

  alumnos = alumnos.filter(a => a.id !== id);
  notas = notas.filter(n => n.alumnoId !== id);

  save("alumnos", alumnos);
  save("notas", notas);

  pintarAlumnos();
});



// =======================
// Asignaturas
// =======================
const tablaAsignaturas = document.getElementById("tablaAsignaturas");

function pintarAsignaturas() {
  tablaAsignaturas.innerHTML = "";
  asignaturas.forEach((asig, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="btn-order" data-dir="up" data-id="${asig.id}">↑</span>
        <span class="btn-order" data-dir="down" data-id="${asig.id}">↓</span>
      </td>
      <td>
        <input type="text" data-id="${asig.id}" value="${asig.nombre}">
      </td>
    `;
    tablaAsignaturas.appendChild(tr);
  });
}

tablaAsignaturas.addEventListener("click", e => {
  const btn = e.target.closest(".btn-order");
  if (!btn) return;
  const id = btn.dataset.id;
  const dir = btn.dataset.dir;
  const idx = asignaturas.findIndex(a => a.id === id);
  if (idx === -1) return;
  if (dir === "up" && idx > 0) {
    [asignaturas[idx - 1], asignaturas[idx]] = [asignaturas[idx], asignaturas[idx - 1]];
  } else if (dir === "down" && idx < asignaturas.length - 1) {
    [asignaturas[idx + 1], asignaturas[idx]] = [asignaturas[idx], asignaturas[idx + 1]];
  }
  save("asignaturas", asignaturas);
  pintarAsignaturas();
  refrescarSelectAsignaturas();
});

tablaAsignaturas.addEventListener("change", e => {
  if (e.target.matches("input[type='text']")) {
    const id = e.target.dataset.id;
    const asig = asignaturas.find(a => a.id === id);
    if (!asig) return;
    const nuevo = e.target.value.trim();
    if (!nuevo) return;
    asig.nombre = nuevo;
    save("asignaturas", asignaturas);
    refrescarSelectAsignaturas();
  }
});

function refrescarSelectAsignaturas() {
  const selAsigPruebas = document.getElementById("asignaturaPruebas");
  selAsigPruebas.innerHTML = "";
  asignaturas.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.nombre;
    selAsigPruebas.appendChild(opt);
  });
}

// =======================
// Pruebas por grupo
// =======================
const selGrupoPr = document.getElementById("grupoPruebas");
const selAsigPr = document.getElementById("asignaturaPruebas");
const selSemPr = document.getElementById("semestrePruebas");
const btnCargarPruebas = document.getElementById("btnCargarPruebas");
const contPruebas = document.getElementById("contenedorPruebas");

function pintarPruebasEditor() {
  contPruebas.innerHTML = "";
  const grupoId = selGrupoPr.value;
  const asigId = selAsigPr.value;
  const semestre = selSemPr.value;
  if (!grupoId || !asigId) return;

  let pruebas = getPruebas(grupoId, asigId, semestre);

  // Si no hay pruebas en este semestre, preguntar si copiar del otro
  if (pruebas.length === 0) {
    const otroSem = semestre === "1" ? "2" : "1";
    const otras = getPruebas(grupoId, asigId, otroSem);
    if (otras.length > 0) {
      const copiar = confirm("No hay pruebas en este semestre. ¿Copiar las del semestre " + otroSem + "?");
      if (copiar) {
        pruebas = otras.map(p => ({
          id: genId("p"),
          nombre: p.nombre,
          peso: p.peso
        }));
        pruebasPorGrupo[grupoId][asigId][semestre] = pruebas;
        save("pruebasPorGrupo", pruebasPorGrupo);
      }
    }
  }

  const wrapper = document.createElement("div");

  pruebas.forEach(p => {
    const fila = document.createElement("div");
    fila.className = "prueba-row";
    fila.innerHTML = `
      <input type="text" data-id="${p.id}" data-tipo="nombre" value="${p.nombre}">
      <input type="number" data-id="${p.id}" data-tipo="peso" value="${p.peso}" min="0" max="100">
      <span>%</span>
      <span class="btn-order" data-tipo="orden" data-dir="up" data-id="${p.id}">↑</span>
      <span class="btn-order" data-tipo="orden" data-dir="down" data-id="${p.id}">↓</span>
      <button class="md-button btn-small" data-tipo="eliminar" data-id="${p.id}">X</button>
    `;
    wrapper.appendChild(fila);
  });

  const filaAdd = document.createElement("div");
  filaAdd.style.marginTop = "8px";
  filaAdd.innerHTML = `
    <button class="md-button btn-small" id="btnAddPrueba">Añadir prueba</button>
    <button class="md-button btn-small md-primary" id="btnGuardarPruebas">Guardar</button>
  `;
  wrapper.appendChild(filaAdd);

  contPruebas.appendChild(wrapper);
}

btnCargarPruebas.addEventListener("click", () => {
  pintarPruebasEditor();
});

contPruebas.addEventListener("click", e => {
  const grupoId = selGrupoPr.value;
  const asigId = selAsigPr.value;
  const semestre = selSemPr.value;
  if (!grupoId || !asigId) return;
  let pruebas = getPruebas(grupoId, asigId, semestre);

  if (e.target.id === "btnAddPrueba") {
    pruebas.push({ id: genId("p"), nombre: "P" + (pruebas.length + 1), peso: 0 });
    save("pruebasPorGrupo", pruebasPorGrupo);
    pintarPruebasEditor();
    return;
  }

  if (e.target.id === "btnGuardarPruebas") {
    const filas = contPruebas.querySelectorAll(".prueba-row");
    const nuevas = [];
    let suma = 0;
    filas.forEach((fila, idx) => {
      const inpNom = fila.querySelector('input[data-tipo="nombre"]');
      const inpPes = fila.querySelector('input[data-tipo="peso"]');
      const id = inpNom.dataset.id;
      const nombre = inpNom.value.trim() || ("P" + (idx + 1));
      let peso = parseFloat(inpPes.value);
      if (isNaN(peso)) peso = 0;
      suma += peso;
      nuevas.push({ id, nombre, peso });
    });
    if (Math.round(suma) !== 100) {
      alert("La suma de los pesos debe ser 100%. Ahora es " + suma);
      return;
    }
    pruebasPorGrupo[grupoId][asigId][semestre] = nuevas;
    save("pruebasPorGrupo", pruebasPorGrupo);
    alert("Pruebas guardadas");
    pintarPruebasEditor();
    return;
  }

  const btnOrder = e.target.closest(".btn-order");
  if (btnOrder && btnOrder.dataset.tipo === "orden") {
    const id = btnOrder.dataset.id;
    const dir = btnOrder.dataset.dir;
    const idx = pruebas.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (dir === "up" && idx > 0) {
      [pruebas[idx - 1], pruebas[idx]] = [pruebas[idx], pruebas[idx - 1]];
    } else if (dir === "down" && idx < pruebas.length - 1) {
      [pruebas[idx + 1], pruebas[idx]] = [pruebas[idx], pruebas[idx + 1]];
    }
    save("pruebasPorGrupo", pruebasPorGrupo);
    pintarPruebasEditor();
    return;
  }

  const btnDel = e.target.closest("button");
  if (btnDel && btnDel.dataset.tipo === "eliminar") {
    const id = btnDel.dataset.id;
    pruebasPorGrupo[grupoId][asigId][semestre] = pruebas.filter(p => p.id !== id);
    save("pruebasPorGrupo", pruebasPorGrupo);
    pintarPruebasEditor();
  }
});

// =======================
// Notas
// =======================
const btnCargarNotas = document.getElementById("btnCargarNotas");
const btnGuardarNotas = document.getElementById("btnGuardarNotas");
const theadNotas = document.getElementById("theadNotas");
const tbodyNotas = document.getElementById("tbodyNotas");
const selSemNotas = document.getElementById("semestreNotas");

function construirCabeceraNotas(grupoId, semestre) {
  // Número máximo de pruebas entre todas las asignaturas
  let maxPruebas = 0;
  asignaturas.forEach(asig => {
    const prs = getPruebas(grupoId, asig.id, semestre);
    if (prs.length > maxPruebas) maxPruebas = prs.length;
  });

  if (maxPruebas === 0) maxPruebas = 1;

  let thPruebas = "";
  for (let i = 1; i <= maxPruebas; i++) {
    thPruebas += `<th>Prueba ${i}</th>`;
  }

  theadNotas.innerHTML = `
    <tr>
      <th>Estudiante</th>
      <th>Actividad de lengua</th>
      ${thPruebas}
      <th>Máx</th>
      <th>Media</th>
      <th>Acta</th>
    </tr>
  `;

  theadNotas.dataset.maxPruebas = maxPruebas;
}



function cargarNotasTabla() {
  const grupoId = selGrupoNotas.value;
  const semestre = selSemNotas.value;
  if (!grupoId) return;

  const alumnosGrupo = alumnosDeGrupoActivos(grupoId, semestre);
  tbodyNotas.innerHTML = "";

  const maxPruebas = parseInt(theadNotas.dataset.maxPruebas || "1", 10);

  alumnosGrupo.forEach(a => {
    const reg = notas.find(r =>
      r.grupoId === grupoId &&
      r.semestre === semestre &&
      r.alumnoId === a.id
    );

    let alumnoMostrado = false;

    asignaturas.forEach(asig => {
      const pruebas = getPruebas(grupoId, asig.id, semestre);
      if (!pruebas.length) return;

      const tr = document.createElement("tr");
      tr.dataset.alumnoId = a.id;
      tr.dataset.asigId = asig.id;

      let valores = [];
      let celdasPruebas = "";

      pruebas.forEach(p => {
        const valor = reg?.notas?.[asig.id]?.[p.id] ?? "";
        const num = parseFloat(valor);
        if (!isNaN(num)) valores.push(num);

        celdasPruebas += `
          <td>
            <div style="font-size:11px;color:#555;">${p.nombre}</div>
            <input type="number" step="0.1"
                   data-asig="${asig.id}"
                   data-prueba="${p.id}"
                   value="${valor}"
                   class="nota-input"
                   style="width:60px;">
          </td>
        `;
      });

      const faltan = maxPruebas - pruebas.length;
      for (let i = 0; i < faltan; i++) celdasPruebas += `<td></td>`;

      const max = valores.length ? Math.max(...valores) : "";
      const media = calcularMediaPruebas(pruebas, reg?.notas?.[asig.id] ?? {});
      const valorActa = reg?.notas?.[asig.id]?.["ACTA"] ?? "";

      tr.innerHTML = `
        <td>${!alumnoMostrado ? a.nombre : ""}</td>
        <td>${asig.nombre}</td>
        ${celdasPruebas}
        <td class="nota-max">${max !== "" ? max.toFixed(2) : ""}</td>
        <td class="media-asig">${media}</td>
        <td>
          <input type="number" step="0.1" min="0" max="10"
                 data-asig="${asig.id}"
                 data-prueba="ACTA"
                 value="${valorActa}"
                 class="nota-input"
                 style="width:60px;">
        </td>
      `;

      tbodyNotas.appendChild(tr);
      alumnoMostrado = true;
    });
  });

  recalcularMediasTabla();
  renderNotasCards(grupoId, semestre, alumnosGrupo);
}

/* ============================================================
   VISTA MÓVIL: TARJETAS POR ALUMNO
   ============================================================ */
function renderNotasCards(grupoId, semestre, alumnosGrupo) {
  const container = document.getElementById("notasCards");
  if (!container) return;
  container.innerHTML = "";

  alumnosGrupo.forEach(a => {
    const reg = notas.find(r =>
      r.grupoId === grupoId &&
      r.semestre === semestre &&
      r.alumnoId === a.id
    );

    const asigsFiltradas = asignaturas.filter(asig =>
      getPruebas(grupoId, asig.id, semestre).length > 0
    );

    const card = document.createElement("div");
    card.className = "alumno-card";
    card.dataset.alumnoId = a.id;

    // Header
    const header = document.createElement("div");
    header.className = "alumno-card-header";
    header.innerHTML = `<span class="alumno-icon">🎓</span> ${a.nombre}`;
    card.appendChild(header);

    // Column headers
    const colHeaders = document.createElement("div");
    colHeaders.className = "col-header-row";
    colHeaders.innerHTML = `
      <div class="col-asig">Act.</div>
      <div>Pruebas</div>
      <div>Máx / Media</div>
      <div>Acta</div>
    `;
    card.appendChild(colHeaders);

    // Body
    const body = document.createElement("div");
    body.className = "alumno-card-body";

    asigsFiltradas.forEach(asig => {
      const pruebas = getPruebas(grupoId, asig.id, semestre);
      const row = document.createElement("div");
      row.className = "asig-row";
      row.dataset.alumnoId = a.id;
      row.dataset.asigId = asig.id;

      // Pruebas group
      let pruebasHTML = `<div class="pruebas-group">`;
      pruebas.forEach(p => {
        const valor = reg?.notas?.[asig.id]?.[p.id] ?? "";
        pruebasHTML += `
          <div class="prueba-entry">
            <span class="prueba-name-small">${p.nombre}</span>
            <input type="number" step="0.1" min="0" max="10"
                   data-asig="${asig.id}"
                   data-prueba="${p.id}"
                   data-alumno="${a.id}"
                   value="${valor}"
                   class="nota-input-sm nota-card-input"
                   inputmode="decimal">
          </div>`;
      });
      pruebasHTML += `</div>`;

      // Calc max & media
      const vals = {};
      pruebas.forEach(p => {
        const v = reg?.notas?.[asig.id]?.[p.id];
        if (v !== undefined) vals[p.id] = v;
      });
      const numVals = Object.values(vals).map(v => parseFloat(v)).filter(v => !isNaN(v));
      const max = numVals.length ? Math.max(...numVals).toFixed(2) : "";
      const media = calcularMediaPruebas(pruebas, vals);
      const valorActa = reg?.notas?.[asig.id]?.["ACTA"] ?? "";

      const maxClass = parseFloat(max) >= 5 ? "nota-verde" : (max !== "" ? "nota-roja" : "");
      const mediaClass = parseFloat(media) >= 5 ? "nota-verde" : (media !== "" ? "nota-roja" : "");

      row.innerHTML = `
        <div class="asig-label">${asig.nombre}</div>
        ${pruebasHTML}
        <div class="cell-stat">
          <span class="cell-stat-label">Máx</span>
          <div class="cell-stat-val card-max ${maxClass}">${max}</div>
          <span class="cell-stat-label">Med</span>
          <div class="cell-stat-val card-media ${mediaClass}">${media}</div>
        </div>
        <div class="cell-stat">
          <input type="number" step="0.1" min="0" max="10"
                 data-asig="${asig.id}"
                 data-prueba="ACTA"
                 data-alumno="${a.id}"
                 value="${valorActa}"
                 class="nota-input-sm nota-card-input"
                 inputmode="decimal">
        </div>
      `;

      body.appendChild(row);
    });

    card.appendChild(body);
    container.appendChild(card);
  });

  // Attach listeners for card inputs
  activarInputsTarjetas(grupoId, semestre);
}

function activarInputsTarjetas(grupoId, semestre) {
  const container = document.getElementById("notasCards");
  if (!container) return;

  container.querySelectorAll(".nota-card-input").forEach(input => {
    // Apply initial color
    aplicarColorElemento(input, input.value);

    input.addEventListener("change", () => {
      const alumnoId = input.dataset.alumno;
      const asigId = input.dataset.asig;
      const pruebaId = input.dataset.prueba;
      const valor = parseFloat(input.value);

      let reg = notas.find(r =>
        r.grupoId === grupoId &&
        r.semestre === semestre &&
        r.alumnoId === alumnoId
      );

      if (!reg) {
        reg = { grupoId, semestre, alumnoId, notas: {} };
        notas.push(reg);
      }

      if (!reg.notas[asigId]) reg.notas[asigId] = {};
      if (!isNaN(valor)) reg.notas[asigId][pruebaId] = valor;
      else delete reg.notas[asigId][pruebaId];

      save("notas", notas);
      aplicarColorElemento(input, input.value);

      // Recalculate max and media in card row
      const row = input.closest(".asig-row");
      if (row) {
        const pruebas = getPruebas(grupoId, asigId, semestre);
        const vals = {};
        row.querySelectorAll(".nota-card-input[data-prueba]").forEach(inp => {
          if (inp.dataset.prueba !== "ACTA") {
            const v = parseFloat(inp.value);
            if (!isNaN(v)) vals[inp.dataset.prueba] = v;
          }
        });
        const numVals = Object.values(vals).map(v => parseFloat(v)).filter(v => !isNaN(v));
        const max = numVals.length ? Math.max(...numVals).toFixed(2) : "";
        const media = calcularMediaPruebas(pruebas, vals);

        const maxEl = row.querySelector(".card-max");
        const mediaEl = row.querySelector(".card-media");
        if (maxEl) {
          maxEl.textContent = max;
          maxEl.className = "cell-stat-val card-max " + (parseFloat(max) >= 5 ? "nota-verde" : (max !== "" ? "nota-roja" : ""));
        }
        if (mediaEl) {
          mediaEl.textContent = media;
          mediaEl.className = "cell-stat-val card-media " + (parseFloat(media) >= 5 ? "nota-verde" : (media !== "" ? "nota-roja" : ""));
        }      }
    });
  });
}



function recalcularMediasTabla() {
  const grupoId = selGrupoNotas.value;
  const semestre = selSemNotas.value;

  tbodyNotas.querySelectorAll("tr").forEach(tr => {
    const alumnoId = tr.dataset.alumnoId;
    const asigId = tr.dataset.asigId;

    const pruebas = getPruebas(grupoId, asigId, semestre);
    const inputs = tr.querySelectorAll(`input[data-asig="${asigId}"]`);

    let valores = {};
    let lista = [];

    inputs.forEach(inp => {
      const pid = inp.dataset.prueba;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && pid !== "ACTA") {
        valores[pid] = v;
        lista.push(v);
      }
      aplicarColorElemento(inp, inp.value);
    });

    const max = lista.length ? Math.max(...lista) : "";
    const media = calcularMediaPruebas(pruebas, valores);

    tr.querySelector(".nota-max").textContent =
      max !== "" ? max.toFixed(2) : "";

    const tdMedia = tr.querySelector(".media-asig");
    tdMedia.textContent = media;
    aplicarColorElemento(tdMedia, media);
  });
}




selGrupoNotas.addEventListener("change", () => {
  const grupoId = selGrupoNotas.value;
  const semestre = selSemNotas.value;
  if (!grupoId) return;
  construirCabeceraNotas(grupoId, semestre);
  cargarNotasTabla();
});

selSemNotas.addEventListener("change", () => {
  const grupoId = selGrupoNotas.value;
  const semestre = selSemNotas.value;
  if (!grupoId) return;
  construirCabeceraNotas(grupoId, semestre);
  cargarNotasTabla();
});

tbodyNotas.addEventListener("blur", e => {
  if (!e.target.matches("input[type='number']")) return;

  const input = e.target;
  const tr = input.closest("tr");
  const alumnoId = tr.dataset.alumnoId;

  const grupoId = selGrupoNotas.value;
  const semestre = selSemNotas.value;

  // Buscar o crear registro de notas del alumno
  let reg = notas.find(r =>
    r.grupoId === grupoId &&
    r.semestre === semestre &&
    r.alumnoId === alumnoId
  );

  if (!reg) {
    reg = { grupoId, semestre, alumnoId, notas: {} };
    notas.push(reg);
  }

  const asigId = input.dataset.asig;
  const pruebaId = input.dataset.prueba;

  if (!reg.notas[asigId]) reg.notas[asigId] = {};

  const valor = parseFloat(input.value);
  if (!isNaN(valor)) reg.notas[asigId][pruebaId] = valor;
  else delete reg.notas[asigId][pruebaId];

  save("notas", notas);

  // Recalcular medias
  recalcularMediasTabla();
}, true);

// =======================
// Medias
// =======================
const btnCalcularMedias = document.getElementById("btnCalcularMedias");
const tbodyMedias = document.getElementById("tbodyMedias");
const selSemMedias = document.getElementById("semestreMedias");

btnCalcularMedias.addEventListener("click", () => {
  const grupoId = selGrupoMedias.value;
  const semestre = selSemMedias.value;
  if (!grupoId) return;
  const regs = notas.filter(r => r.grupoId === grupoId && r.semestre === semestre);
  tbodyMedias.innerHTML = "";
  asignaturas.forEach(asig => {
    const pruebas = getPruebas(grupoId, asig.id, semestre);
    if (!pruebas.length) return;
    const listaMedias = regs.map(r => {
      const vals = r.notas && r.notas[asig.id] ? r.notas[asig.id] : {};
      const m = calcularMediaPruebas(pruebas, vals);
      return parseFloat(m);
    });
    const mFinal = mediaSinCeros(listaMedias);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${asig.nombre}</td><td>${mFinal}</td>`;
    tbodyMedias.appendChild(tr);
    aplicarColorElemento(tr.children[1], mFinal);
  });
});

// =======================
// Init
// =======================
function init() {
  refrescarSelectGrupos();
  refrescarSelectAsignaturas();
  pintarGrupos();
  pintarAlumnos();
  pintarAsignaturas();
}

/* ============================================================
   IMPORTAR / EXPORTAR
   ============================================================ */

const btnExportar = document.getElementById("btnExportar");
const inputImportar = document.getElementById("inputImportar");

/* -----------------------------
   EXPORTAR
   ----------------------------- */
btnExportar.addEventListener("click", () => {
  const data = {
    grupos,
    alumnos,
    asignaturas,
    pruebasPorGrupo,
    notas
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "datos_notas.json";
  a.click();

  URL.revokeObjectURL(url);
});

/* -----------------------------
   IMPORTAR
   ----------------------------- */
inputImportar.addEventListener("change", () => {
  const file = inputImportar.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.grupos || !data.alumnos || !data.asignaturas || !data.pruebasPorGrupo || !data.notas) {
        alert("El archivo no contiene un formato válido.");
        return;
      }

      // Sobrescribir datos
      grupos = data.grupos;
      alumnos = data.alumnos;
      asignaturas = data.asignaturas;
      pruebasPorGrupo = data.pruebasPorGrupo;
      notas = data.notas;

      // Guardar en localStorage
      save("grupos", grupos);
      save("alumnos", alumnos);
      save("asignaturas", asignaturas);
      save("pruebasPorGrupo", pruebasPorGrupo);
      save("notas", notas);

      alert("Datos importados correctamente. La aplicación se recargará.");
      location.reload();

    } catch (err) {
      alert("Error al leer el archivo JSON.");
    }
  };

  reader.readAsText(file);
});

/* ============================================================
   IMPORTAR DESDE CSV (con creación automática de P1 y P2)
   ============================================================ */

const inputCSV = document.getElementById("inputCSV");

inputCSV.addEventListener("change", () => {
  const file = inputCSV.files[0];
  if (!file) return;

  const reader = new FileReader();

  // IMPORTANTE: leer CSV ANSI como Windows-1252
  reader.readAsText(file, "windows-1252");

  reader.onload = e => {
    const texto = e.target.result;
    const lineas = texto.split(/\r?\n/);

    let nuevosAlumnos = 0;

    lineas.forEach(linea => {
      if (!linea.trim()) return; // descartar líneas vacías

      const partes = linea.split(",");

      if (partes.length < 5) return; // formato incorrecto

      const apellidos = partes[0].trim();
      const nombre = partes[1].trim();
      const nivel = partes[2].trim();
      const grupoNombre = partes[3].trim();
      const tutor = partes[4].trim();

      // Buscar o crear grupo
      let grupo = grupos.find(g => g.nombre.toLowerCase() === grupoNombre.toLowerCase());

      if (!grupo) {
        grupo = { id: genId("g"), nombre: grupoNombre };
        grupos.push(grupo);

        // ============================================================
        // CREAR P1 y P2 (50%) PARA TODAS LAS ASIGNATURAS DEL GRUPO NUEVO
        // ============================================================
        if (!pruebasPorGrupo[grupo.id]) pruebasPorGrupo[grupo.id] = {};

        asignaturas.forEach(asig => {
          if (!pruebasPorGrupo[grupo.id][asig.id])
            pruebasPorGrupo[grupo.id][asig.id] = {};

          ["1", "2"].forEach(sem => {
            pruebasPorGrupo[grupo.id][asig.id][sem] = [
              { id: genId("p"), nombre: "P1", peso: 50 },
              { id: genId("p"), nombre: "P2", peso: 50 }
            ];
          });
        });
        // ============================================================
      }

      // Crear alumno
      alumnos.push({
        id: genId("al"),
        nombre: `${apellidos}, ${nombre}`,
        grupoId: grupo.id,
        activo1: true,
        activo2: true,
        comentarios: ``
      });

      nuevosAlumnos++;
    });

    save("grupos", grupos);
    save("alumnos", alumnos);
    save("pruebasPorGrupo", pruebasPorGrupo);

    alert(`Importación completada. ${nuevosAlumnos} alumnos añadidos.`);
    location.reload();
  };
});


/* ============================================================
   BORRAR BASE DE DATOS
   ============================================================ */

const btnBorrarBD = document.getElementById("btnBorrarBD");

btnBorrarBD.addEventListener("click", () => {
  if (!confirm("¿Seguro que deseas borrar TODOS los datos? Esta acción no se puede deshacer.")) {
    return;
  }

  localStorage.clear();
  alert("Base de datos borrada. La aplicación se reiniciará.");
  location.reload();
});

document.addEventListener("DOMContentLoaded", () => {
  const btnCambiarCred = document.getElementById("btnCambiarCred");
  const panelCred      = document.getElementById("panelCred");
  const btnGuardarCred = document.getElementById("btnGuardarCred");
  const inputNuevoUser = document.getElementById("nuevoUser");
  const inputNuevoPass = document.getElementById("nuevoPass");

  btnCambiarCred.addEventListener("click", () => {
    panelCred.style.display = panelCred.style.display === "none" ? "block" : "none";
  });

  btnGuardarCred.addEventListener("click", () => {
    const nuevoUser = inputNuevoUser.value.trim();
    const nuevoPass = inputNuevoPass.value.trim();

    if (!nuevoUser || !nuevoPass) {
      alert("Debes introducir usuario y contraseña");
      return;
    }

    localStorage.setItem("credenciales", JSON.stringify({
      usuario: nuevoUser,
      password: nuevoPass
    }));

    alert("Credenciales actualizadas correctamente");
    panelCred.style.display = "none";
  });
});

init();
