document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

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
                    // Buscar la posición del conductor actual
                    const position = attendanceData.findIndex(record => 
                        record.driver === driverData.driver.name
                    );
                    
                    if (position !== -1) {
                        messageElement.innerHTML = `
                            <div class="alert alert-info">
                                Estás en el puesto ${position + 1} de la fila
                            </div>`;
                    } else {
                        messageElement.innerHTML = `
                            <div class="alert alert-warning">
                                No tienes registros pendientes por salir
                            </div>`;
                    }
                } else {
                    messageElement.innerHTML = '';
                }
            } else {
                messageElement.innerHTML = '';
            }

            filterAndDisplayData();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            pendingList.innerHTML = `<li class="no-results">Error al cargar los datos: ${error.message}</li>`;
            messageElement.innerHTML = '';
        }
    }

    // Función para filtrar y mostrar datos
    function filterAndDisplayData() {
        const selectedVehicle = vehicleFilter.value;

        const filteredData = attendanceData.filter(record => 
            !selectedVehicle || record.vehicleType === selectedVehicle
        );

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
                        ${record.vehicleType}
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