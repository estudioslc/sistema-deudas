// Configuración de Supabase
const SUPABASE_URL = 'https://jigyfacxaifgdogaduf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3lmYWdjeGFpZmdkb2dhZHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQ1NDcsImV4cCI6MjA4NzA3MDU0N30.zreu5LPBTgmITGiAGrwEAky6RvIaXjFr3E6sXcK0Olw';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable para almacenar los datos cargados
let datosDeudas = [];

// Función para cargar Excel
async function cargarExcel() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor seleccioná un archivo Excel');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Guardar en variable local
        datosDeudas = jsonData;
        
        // Guardar en Supabase
        await guardarEnSupabase(jsonData);
        
        alert(`Se cargaron ${jsonData.length} registros`);
        mostrarResultados(jsonData);
    };
    reader.readAsArrayBuffer(file);
}

// Función para guardar en Supabase
async function guardarEnSupabase(datos) {
    for (let deuda of datos) {
        const { error } = await supabase
            .from('deudas')
            .upsert({
                jud_id: deuda.Jud_id || deuda.jud_id,
                expediente: deuda.Expediente || deuda.expediente,
                caratula: deuda.Caratula || deuda.caratula,
                nominal: parseFloat(deuda.Nominal || deuda.nominal) || 0,
                accesorios: parseFloat(deuda.Accesorios || deuda.accesorios) || 0,
                multa: parseFloat(deuda.Multa || deuda.multa) || 0,
                obj_id: deuda.Obj_id || deuda.obj_id,
                tipo_obj: deuda.Tipo_Obj || deuda.tipo_obj,
                identificador: deuda.Identificador || deuda.identificador,
                titular: deuda.Titular || deuda.titular,
                cuit: deuda.CUIT || deuda.cuit,
                telefono: deuda.Telefono || deuda.telefono,
                mail: deuda.Mail || deuda.mail,
                regimen: deuda.Regimen || deuda.regimen,
                anio_fab: parseInt(deuda.Anio_Fab || deuda.anio_fab) || 0,
                valor_rodado: parseFloat(deuda.Valor_Rodado || deuda.valor_rodado) || 0,
                causa: deuda.Causa || deuda.causa,
                fch_infrac: deuda.FchInfrac || deuda.fch_infrac,
                hora_infrac: deuda.Hora_Infrac || deuda.hora_infrac,
                infraccion: deuda.Infraccion || deuda.infraccion,
                vehiculo: deuda.Vehiculo || deuda.vehiculo,
                domicilio_postal: deuda.Domicilio_Postal || deuda.domicilio_postal,
                domicilio_inmueble: deuda.Domicilio_Inmueble || deuda.domicilio_inmueble,
                barrio_inmueble: deuda.Barrio_Inmueble || deuda.barrio_inmueble,
                domicilio_juzgado: deuda.Domicilio_Juzgado || deuda.domicilio_juzgado,
                obs: deuda.Obs || deuda.obs,
                carpeta: deuda.Carpeta || deuda.carpeta,
                estado: deuda.Estado || deuda.estado
            });
        
        if (error) console.error('Error guardando:', error);
    }
}

// Función para buscar deuda
async function buscarDeuda() {
    const searchInput = document.getElementById('searchInput').value.trim();
    
    if (!searchInput) {
        alert('Ingresá un número de causa');
        return;
    }
    
    // Buscar en Supabase
    const { data, error } = await supabase
        .from('deudas')
        .select('*')
        .or(`jud_id.ilike.%${searchInput}%,expediente.ilike.%${searchInput}%`);
    
    if (error) {
        console.error('Error buscando:', error);
        return;
    }
    
    if (data.length === 0) {
        document.getElementById('resultados').innerHTML = '<p>No se encontraron resultados</p>';
        return;
    }
    
    mostrarResultados(data);
}

// Función para mostrar resultados
function mostrarResultados(deudas) {
    const container = document.getElementById('resultados');
    const showEstado = document.getElementById('showEstado').checked;
    const showNombre = document.getElementById('showNombre').checked;
    const showMonto = document.getElementById('showMonto').checked;
    const showNotas = document.getElementById('showNotas').checked;
    
    let html = `<h3>Resultados: ${deudas.length} deuda(s)</h3>`;
    
    for (let deuda of deudas) {
        html += `<div class="deuda-card">`;
        
        if (showEstado) {
            html += `<p><strong>Estado:</strong> <span class="estado-${deuda.estado}">${getEstadoNombre(deuda.estado)}</span></p>`;
        }
        
        if (showNombre) {
            html += `<p><strong>Contribuyente:</strong> ${deuda.caratula || 'N/A'}</p>`;
            html += `<p><strong>CUIT:</strong> ${deuda.cuit || 'N/A'}</p>`;
        }
        
        if (showMonto) {
            const total = calcularTotal(deuda);
            html += `<p><strong>Capital:</strong> $${deuda.nominal?.toFixed(2) || '0.00'}</p>`;
            html += `<p><strong>Total actualizado:</strong> $${total.toFixed(2)}</p>`;
        }
        
        if (showNotas) {
            html += `<p><strong>Último movimiento:</strong></p>`;
            html += `<input type="text" class="notas-input" value="${deuda.notas_seguimiento || ''}" 
                     onchange="guardarNota('${deuda.jud_id}', this.value)" placeholder="Ej: Contactado, va a pagar...">`;
        }
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

// Función para calcular total actualizado
function calcularTotal(deuda) {
    const tasaDiaria = 0.001082;
    const fechaBase = new Date('2025-11-28');
    const fechaHoy = new Date();
    const diasDiferencia = Math.floor((fechaHoy - fechaBase) / (1000 * 60 * 60 * 24));
    
    let gastosFijos = 0;
    if (deuda.estado === 'X') {
        gastosFijos = 26385.22 + (deuda.nominal * 0.35);
    } else if (deuda.estado === 'D' || deuda.estado === 'S') {
        gastosFijos = deuda.anio_fab >= 2020 ? 235401.39 : 231875.28;
    } else if (deuda.estado === 'E') {
        gastosFijos = deuda.anio_fab >= 2020 ? 397953.59 : 394427.48;
    }
    
    const intereses = deuda.nominal * Math.pow(1 + tasaDiaria, diasDiferencia) - deuda.nominal;
    return deuda.nominal + intereses + deuda.accesorios + gastosFijos;
}

// Función para guardar nota
async function guardarNota(judId, nota) {
    const { error } = await supabase
        .from('deudas')
        .update({ 
            notas_seguimiento: nota,
            fecha_ultima_actualizacion: new Date().toISOString()
        })
        .eq('jud_id', judId);
    
    if (error) {
        console.error('Error guardando nota:', error);
        alert('Error al guardar la nota');
    } else {
        console.log('Nota guardada');
    }
}

// Función para exportar a Excel
async function exportarExcel() {
    const { data, error } = await supabase
        .from('deudas')
        .select('*');
    
    if (error) {
        console.error('Error exportando:', error);
        return;
    }
    
    // Preparar datos para exportar
    const datosExportar = data.map(d => ({
        'Número': `${d.tipo_obj}/${d.jud_id}/${d.anio_fab}`,
        'Estado': getEstadoNombre(d.estado),
        'Contribuyente': d.caratula,
        'CUIT': d.cuit,
        'Capital': d.nominal,
        'Total Actualizado': calcularTotal(d),
        'Notas': d.notas_seguimiento || '',
        'Teléfono': d.telefono,
        'Email': d.mail,
        'Dirección': d.domicilio_postal || d.domicilio_inmueble
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deudas");
    XLSX.writeFile(wb, "deudas_actualizadas.xlsx");
}

// Función auxiliar para nombre de estado
function getEstadoNombre(estado) {
    const estados = {
        'X': 'Extrajudicial',
        'D': 'Demanda',
        'S': 'Sentencia',
        'E': 'Ejecución',
        'P': 'Pagado',
        'C': 'Convenio'
    };
    return estados[estado] || estado;
}
