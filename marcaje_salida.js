// URL del Google Apps Script
const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzPoOlGgJjwGE0o0zNer8kGlVWT0oPtCysOkhR6VUpZCsqCqi6A3DWj6bPfUOS-x6ue/exec';

// Variables globales
let currentExitData = null;
let attendanceData = [];
let drivers = new Set();
let absentDrivers = {}; // { nombre: { count: 0, index: null } }

// Función para cargar sectores
async function loadSectors() {
    try {
        const response = await fetch(`${googleAppScriptUrl}?action=getSectors`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const sectorSelect = document.getElementById('sector');
        sectorSelect.innerHTML = '';
        data.sectors.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector;
            option.textContent = sector;
            sectorSelect.appendChild(option);
        });

        // Agregar manejo de eventos táctiles para mejorar la selección múltiple
        let touchTimeout;
        sectorSelect.addEventListener('touchstart', function(e) {
            touchTimeout = setTimeout(() => {
                // Prevenir el zoom en dispositivos móviles
                e.preventDefault();
            }, 500);
        });

        sectorSelect.addEventListener('touchend', function(e) {
            clearTimeout(touchTimeout);
            updateSelectedSectorsDisplay();
        });

    } catch (error) {
        console.error('Error al cargar sectores:', error);
        alert('Error al cargar sectores. Por favor, recargue la página.');
    }
}

// Función para verificar la contraseña
window.verifyPassword = function() {
    const passwordInput = document.getElementById('password');
    const passwordError = document.getElementById('password-error');
    const passwordModal = document.getElementById('passwordModal');
    const mainContent = document.getElementById('mainContent');

    const password = passwordInput.value;
    if (password === 'slr2025#') {
        passwordModal.style.display = 'none';
        mainContent.style.display = 'block';
        // Iniciar la carga de datos después de verificar la contraseña
        loadSectors();
        fetchAttendanceData();
    } else {
        passwordError.style.display = 'block';
        passwordInput.value = '';
    }
}

// Función para actualizar el display de sectores seleccionados
function updateSelectedSectorsDisplay() {
    const sectorSelect = document.getElementById('sector');
    const selectedSectors = Array.from(sectorSelect.selectedOptions).map(option => option.value);
    const displayDiv = document.getElementById('selectedSectorsDisplay');
    
    if (selectedSectors.length > 0) {
        displayDiv.innerHTML = selectedSectors
            .map(sector => `<span class="sector-tag">${sector}</span>`)
            .join('');
    } else {
        displayDiv.innerHTML = '';
    }
}

// Función para hacer peticiones al servidor
async function makeRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        mode: 'cors',
        redirect: 'follow',
        headers: {
            'Accept': 'application/json'
        }
    };

    if (method === 'POST' && data) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = data;
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error('Error en la petición:', error);
        throw new Error(`Error de conexión: ${error.message}. Por favor, inténtelo de nuevo.`);
    }
}

// Función para validar campos del modal
function validateExitFields() {
    let isValid = true;
    const bolsos = document.getElementById('bolsos');
    const sector = document.getElementById('sector');
    const ssl = document.getElementById('ssl');

    // Validar Bolsos
    if (bolsos.value === '' || bolsos.value < 0 || bolsos.value > 6) {
        document.getElementById('bolsos-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('bolsos-error').style.display = 'none';
    }

    // Validar Sector (múltiple)
    const selectedSectors = Array.from(sector.selectedOptions).map(option => option.value);
    if (selectedSectors.length === 0) {
        document.getElementById('sector-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('sector-error').style.display = 'none';
    }

    // Validar SSL
    if (ssl.value === '' || ssl.value < 0 || ssl.value > 3) {
        document.getElementById('ssl-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('ssl-error').style.display = 'none';
    }

    return isValid;
}

// Función para mostrar el modal de salida
window.showExitModal = function(timestamp, button) {
    const exitModal = document.getElementById('exitModal');
    currentExitData = { timestamp, button };
    document.getElementById('bolsos').value = '';
    document.getElementById('sector').value = '';
    document.getElementById('ssl').value = '';
    document.getElementById('selectedSectorsDisplay').innerHTML = '';
    exitModal.style.display = 'block';
}

// Función para cerrar el modal
window.closeExitModal = function() {
    const exitModal = document.getElementById('exitModal');
    exitModal.style.display = 'none';
    if (currentExitData && currentExitData.button) {
        currentExitData.button.disabled = false;
        currentExitData.button.textContent = 'Marcar Salida';
    }
    currentExitData = null;
}

// Función para marcar como ausente
window.markAbsent = function(driverName, rowIndex) {
    if (!absentDrivers[driverName]) {
        absentDrivers[driverName] = { count: 0, index: rowIndex };
    }
    // Poner el nombre en rojo y resetear el contador
    absentDrivers[driverName].count = 0;
    absentDrivers[driverName].index = rowIndex;
    updateDriverRowStyles();
};

// Función para actualizar estilos y contador de ausentes
function updateDriverRowStyles() {
    const rows = document.querySelectorAll('#exitList tr');
    rows.forEach((row, idx) => {
        const nameCell = row.querySelector('.driver-name-cell');
        if (!nameCell) return;
        const driverName = nameCell.getAttribute('data-driver');
        if (absentDrivers[driverName]) {
            nameCell.style.color = 'red';
            let count = absentDrivers[driverName].count;
            let baseName = nameCell.getAttribute('data-base-name');
            nameCell.innerHTML = `${baseName} <span style='font-weight:normal'>(<span class='absent-count'>${count}</span>)</span>`;
        } else {
            nameCell.style.color = '';
            nameCell.innerHTML = nameCell.getAttribute('data-base-name');
        }
    });
}

// Función para incrementar el contador de ausentes cuando alguien sale
function incrementAbsentCounters() {
    Object.keys(absentDrivers).forEach(driver => {
        absentDrivers[driver].count++;
    });
    updateDriverRowStyles();
}

// Función para confirmar la salida
window.confirmExit = async function() {
    if (!validateExitFields() || !currentExitData) return;

    const { timestamp, button } = currentExitData;
    const bolsos = document.getElementById('bolsos').value;
    const selectedSectors = Array.from(document.getElementById('sector').selectedOptions).map(option => option.value);
    const ssl = document.getElementById('ssl').value;

    try {
        button.disabled = true;
        button.textContent = 'Procesando...';

        const formData = new URLSearchParams();
        formData.append('action', 'markExit');
        formData.append('timestamp', timestamp);
        formData.append('bolsos', bolsos);
        formData.append('sector', selectedSectors.join(', ')); // Enviar sectores separados por coma
        formData.append('ssl', ssl);

        const result = await makeRequest(googleAppScriptUrl, 'POST', formData);

        if (result.status === 'success') {
            // Esperar un momento antes de cerrar el modal y actualizar
            await new Promise(resolve => setTimeout(resolve, 1000));
            document.getElementById('exitModal').style.display = 'none';
            button.closest('tr').remove();
            incrementAbsentCounters(); // Incrementar contador de ausentes
            // Actualizar datos
            fetchAttendanceData();
        } else {
            throw new Error(result.message || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error al marcar salida:', error);
        button.textContent = 'Error';
        button.disabled = false;
        alert('Error al marcar la salida: ' + error.message);
    }
}

// Función para calcular tiempo de espera
function calculateWaitingTime(timestamp) {
    const start = new Date(timestamp);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Función para cargar los datos de asistencia
async function fetchAttendanceData() {
    try {
        const data = await makeRequest(`${googleAppScriptUrl}?action=getAttendances`);

        // Filtrar solo registros sin hora de salida
        attendanceData = data.attendances
            .filter(record => !record.exitTime)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Actualizar lista de conductores para el filtro
        drivers.clear();
        attendanceData.forEach(record => {
            if (record.driver) {
                drivers.add(record.driver);
            }
        });

        updateDriverFilter();
        filterAndDisplayData();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        document.getElementById('exitList').innerHTML = `<tr><td colspan="3">Error al cargar los datos: ${error.message}</td></tr>`;
    }
}

// Función para actualizar el filtro de conductores
function updateDriverFilter() {
    const driverFilter = document.getElementById('driverFilter');
    const currentValue = driverFilter.value;
    driverFilter.innerHTML = '<option value="">Todos</option>';
    
    Array.from(drivers).sort().forEach(driver => {
        const option = document.createElement('option');
        option.value = driver;
        option.textContent = driver;
        if (driver === currentValue) {
            option.selected = true;
        }
        driverFilter.appendChild(option);
    });
}

// Función para filtrar y mostrar datos
function filterAndDisplayData() {
    const driverFilter = document.getElementById('driverFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');
    const exitList = document.getElementById('exitList');
    
    const selectedDriver = driverFilter.value;
    const selectedVehicle = vehicleFilter.value;
    const today = new Date().toLocaleDateString('es-ES');

    const filteredData = attendanceData.filter(record => {
        const recordDate = new Date(record.timestamp).toLocaleDateString('es-ES');
        return recordDate === today && 
               (!selectedDriver || record.driver === selectedDriver) &&
               (!selectedVehicle || record.vehicleType === selectedVehicle);
    });

    if (!filteredData.length) {
        exitList.innerHTML = '<tr><td colspan="2">No hay conductores pendientes por marcar salida</td></tr>';
        return;
    }

    exitList.innerHTML = filteredData.map((record, idx) => {
        const date = new Date(record.timestamp);
        const timeString = date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // Determinar el emoji según el tipo de vehículo
        const vehicleEmoji = record.vehicleType.toLowerCase().includes('moto') ? '🛵' : '🚗';
        
        // Nombre base para restaurar
        const baseName = `${vehicleEmoji} ${record.driver}`;
        // Si está ausente, mostrar contador
        let nameHtml = `<span class='driver-name-cell' data-driver="${record.driver}" data-base-name="${baseName}">${baseName}</span>`;
        if (absentDrivers[record.driver]) {
            nameHtml = `<span class='driver-name-cell' data-driver="${record.driver}" data-base-name="${baseName}" style='color:red;'>${baseName} <span style='font-weight:normal'>(<span class='absent-count'>${absentDrivers[record.driver].count}</span>)</span></span>`;
        }
        return `
        <tr>
            <td>${nameHtml}</td>
            <td><button class="absent-btn" title="Marcar Ausente" onclick="markAbsent('${record.driver}', ${idx})">Ausente</button></td>
            <td>
                <button 
                    class="mark-exit-button salida-btn"
                    onclick="showExitModal('${timeString}', this)"
                >
                    Salida
                </button>
            </td>
        </tr>
        `;
    }).join('');
    updateDriverRowStyles();
}

// Event listeners cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const passwordInput = document.getElementById('password');
    const driverFilter = document.getElementById('driverFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');
    const sectorSelect = document.getElementById('sector');

    // Event listeners para filtros
    driverFilter.addEventListener('change', filterAndDisplayData);
    vehicleFilter.addEventListener('change', filterAndDisplayData);

    // Event listener para el campo de contraseña
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyPassword();
        }
    });

    // Event listeners para el sector
    sectorSelect.addEventListener('change', updateSelectedSectorsDisplay);
    sectorSelect.addEventListener('blur', updateSelectedSectorsDisplay);

    // Cargar sectores y datos iniciales
    loadSectors();
    fetchAttendanceData();

    // Actualizar datos cada minuto
    setInterval(fetchAttendanceData, 60000);
}); 