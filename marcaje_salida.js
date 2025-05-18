document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // Referencias a elementos del DOM
    const exitList = document.getElementById('exitList');
    const driverFilter = document.getElementById('driverFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');

    // Variables para almacenar datos
    let attendanceData = [];
    let drivers = new Set();

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

    // Función para marcar la salida
    async function markExit(timestamp, button) {
        try {
            button.disabled = true;
            button.textContent = 'Procesando...';

            const formData = new URLSearchParams();
            formData.append('action', 'markExit');
            formData.append('timestamp', timestamp);

            const response = await fetch(googleAppScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                button.closest('tr').remove();
                // Actualizar datos
                fetchAttendanceData();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error al marcar salida:', error);
            button.textContent = 'Error';
            button.disabled = false;
            alert('Error al marcar la salida: ' + error.message);
        }
    }

    // Función para cargar los datos de asistencia
    async function fetchAttendanceData() {
        try {
            const response = await fetch(`${googleAppScriptUrl}?action=getAttendances`);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

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

        exitList.innerHTML = filteredData.map(record => `
            <tr>
                <td>${record.driver}</td>
                <td>${record.vehicleType}</td>
                <td>${new Date(record.timestamp).toLocaleTimeString('es-ES')}</td>
                <td class="waiting-time">${calculateWaitingTime(record.timestamp)}</td>
                <td>
                    <button 
                        class="mark-exit-button"
                        onclick="markExit('${record.timestamp}', this)"
                    >
                        Marcar Salida
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Event listeners para filtros
    driverFilter.addEventListener('change', filterAndDisplayData);
    vehicleFilter.addEventListener('change', filterAndDisplayData);

    // Exponer función markExit globalmente
    window.markExit = markExit;

    // Actualizar datos cada minuto
    setInterval(fetchAttendanceData, 60000);

    // Cargar datos iniciales
    fetchAttendanceData();
}); 