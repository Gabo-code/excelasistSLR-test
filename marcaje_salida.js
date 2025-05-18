document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // Referencias a elementos del DOM
    const exitList = document.getElementById('exitList');
    const driverFilter = document.getElementById('driverFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');
    const exitModal = document.getElementById('exitModal');
    const sectorSelect = document.getElementById('sector');

    // Variables para almacenar datos
    let attendanceData = [];
    let drivers = new Set();
    let currentExitData = null;

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

            sectorSelect.innerHTML = '<option value="">Seleccione un sector</option>';
            data.sectors.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar sectores:', error);
            alert('Error al cargar sectores. Por favor, recargue la página.');
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
        const carros = document.getElementById('carros');
        const sector = document.getElementById('sector');
        const ssl = document.getElementById('ssl');

        // Validar Bolsos
        if (bolsos.value === '' || bolsos.value < 0 || bolsos.value > 6) {
            document.getElementById('bolsos-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('bolsos-error').style.display = 'none';
        }

        // Validar Carros
        if (carros.value === '' || carros.value < 1 || carros.value > 6) {
            document.getElementById('carros-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('carros-error').style.display = 'none';
        }

        // Validar Sector
        if (!sector.value) {
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
    function showExitModal(timestamp, button) {
        currentExitData = { timestamp, button };
        document.getElementById('bolsos').value = '';
        document.getElementById('carros').value = '';
        document.getElementById('sector').value = '';
        document.getElementById('ssl').value = '';
        exitModal.style.display = 'block';
    }

    // Función para cerrar el modal
    window.closeExitModal = function() {
        exitModal.style.display = 'none';
        if (currentExitData && currentExitData.button) {
            currentExitData.button.disabled = false;
            currentExitData.button.textContent = 'Marcar Salida';
        }
        currentExitData = null;
    }

    // Función para confirmar la salida
    window.confirmExit = async function() {
        if (!validateExitFields() || !currentExitData) return;

        const { timestamp, button } = currentExitData;
        const bolsos = document.getElementById('bolsos').value;
        const carros = document.getElementById('carros').value;
        const sector = document.getElementById('sector').value;
        const ssl = document.getElementById('ssl').value;

        try {
            button.disabled = true;
            button.textContent = 'Procesando...';

            const formData = new URLSearchParams();
            formData.append('action', 'markExit');
            formData.append('timestamp', timestamp);
            formData.append('bolsos', bolsos);
            formData.append('carros', carros);
            formData.append('sector', sector);
            formData.append('ssl', ssl);

            const result = await makeRequest(googleAppScriptUrl, 'POST', formData);

            if (result.status === 'success') {
                // Esperar un momento antes de cerrar el modal y actualizar
                await new Promise(resolve => setTimeout(resolve, 1000));
                exitModal.style.display = 'none';
                button.closest('tr').remove();
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

            // Filtrar solo registros de hoy sin hora de salida
            const today = new Date().toLocaleDateString('es-ES');
            attendanceData = data.attendances
                .filter(record => {
                    const recordDate = new Date(record.timestamp).toLocaleDateString('es-ES');
                    return recordDate === today && !record.exitTime;
                })
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
            exitList.innerHTML = `<tr><td colspan="5">Error al cargar los datos: ${error.message}</td></tr>`;
        }
    }

    // Función para actualizar el filtro de conductores
    function updateDriverFilter() {
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
        const selectedDriver = driverFilter.value;
        const selectedVehicle = vehicleFilter.value;

        const filteredData = attendanceData.filter(record => 
            (!selectedDriver || record.driver === selectedDriver) &&
            (!selectedVehicle || record.vehicleType === selectedVehicle)
        );

        if (!filteredData.length) {
            exitList.innerHTML = '<tr><td colspan="5">No hay conductores pendientes por marcar salida</td></tr>';
            return;
        }

        exitList.innerHTML = filteredData.map(record => {
            const date = new Date(record.timestamp);
            const timeString = date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            return `
            <tr>
                <td>${record.driver}</td>
                <td>${record.vehicleType}</td>
                <td>${timeString}</td>
                <td class="waiting-time">${calculateWaitingTime(record.timestamp)}</td>
                <td>
                    <button 
                        class="mark-exit-button"
                        onclick="showExitModal('${timeString}', this)"
                    >
                        Marcar Salida
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    // Event listeners para filtros
    driverFilter.addEventListener('change', filterAndDisplayData);
    vehicleFilter.addEventListener('change', filterAndDisplayData);

    // Exponer funciones globalmente
    window.showExitModal = showExitModal;

    // Cargar sectores y datos iniciales
    loadSectors();
    fetchAttendanceData();

    // Actualizar datos cada minuto
    setInterval(fetchAttendanceData, 60000);
}); 