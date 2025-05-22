document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzPoOlGgJjwGE0o0zNer8kGlVWT0oPtCysOkhR6VUpZCsqCqi6A3DWj6bPfUOS-x6ue/exec';

    // Referencias a elementos del DOM
    const pendingList = document.getElementById('pendingList');
    const vehicleFilter = document.getElementById('vehicleFilter');
    const messageElement = document.createElement('div');
    messageElement.className = 'position-message';
    pendingList.parentNode.insertBefore(messageElement, pendingList);

    // Variables para almacenar datos
    let attendanceData = [];

    // Función para obtener PID del usuario actual
    function getCurrentPID() {
        return localStorage.getItem('driverPID');
    }

    // Función para cargar los datos de asistencia
    async function fetchAttendanceData() {
        try {
            const pid = getCurrentPID();
            const response = await fetch(`${googleAppScriptUrl}?action=getAttendances`);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Obtener todos los registros sin hora de salida
            attendanceData = data.attendances
                .filter(record => !record.exitTime)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Si hay un PID, verificar si el conductor está registrado
            if (pid) {
                const driverResponse = await fetch(`${googleAppScriptUrl}?action=getDriverByPID&pid=${pid}`);
                const driverData = await driverResponse.json();
                
                if (driverData.driver) {
                    // Buscar la posición del conductor actual en los registros de hoy
                    const today = new Date().toLocaleDateString('es-ES');
                    const todayRecords = attendanceData.filter(record => {
                        const recordDate = new Date(record.timestamp).toLocaleDateString('es-ES');
                        return recordDate === today;
                    });
                    
                    const position = todayRecords.findIndex(record => 
                        record.driver === driverData.driver.name
                    );
                    
                    if (position !== -1) {
                        messageElement.innerHTML = `
                            <div class="alert alert-info">
                                <strong>${driverData.driver.name}</strong>: Estás en el puesto ${position + 1} de la lista de espera
                            </div>`;
                    } else {
                        messageElement.innerHTML = `
                            <div class="alert alert-warning">
                                No estás en la lista de espera
                            </div>`;
                    }
                } else {
                    messageElement.innerHTML = `
                        <div class="alert alert-warning">
                            No estás en la lista de espera
                        </div>`;
                }
            } else {
                messageElement.innerHTML = `
                    <div class="alert alert-warning">
                        No estás en la lista de espera
                    </div>`;
            }

            filterAndDisplayData();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            pendingList.innerHTML = `<li class="no-results">Error al cargar los datos: ${error.message}</li>`;
            messageElement.innerHTML = '';
        }
    }

    // Función para formatear la hora
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // Función para filtrar y mostrar datos
    function filterAndDisplayData() {
        const selectedVehicle = vehicleFilter.value;
        const today = new Date().toLocaleDateString('es-ES');

        const filteredData = attendanceData.filter(record => {
            const recordDate = new Date(record.timestamp).toLocaleDateString('es-ES');
            return recordDate === today && 
                   (!selectedVehicle || record.vehicleType === selectedVehicle);
        });

        if (!filteredData.length) {
            pendingList.innerHTML = '<li class="no-results">No hay conductores pendientes por salir</li>';
            return;
        }

        pendingList.innerHTML = filteredData.map((record, index) => `
            <li class="pending-item">
                <div class="position-number">${index + 1}</div>
                <div class="driver-info">
                    <div class="driver-name">${record.driver}</div>
                    <div class="driver-details">
                        ${record.vehicleType} - Ingreso: ${formatTime(record.timestamp)}
                    </div>
                </div>
            </li>
        `).join('');
    }

    // Event listener para el filtro
    vehicleFilter.addEventListener('change', filterAndDisplayData);

    // Cargar datos iniciales
    fetchAttendanceData();

    // Actualizar datos cada minuto
    setInterval(fetchAttendanceData, 60000);
}); 