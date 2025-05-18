document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // Referencias a elementos del DOM
    const pendingList = document.getElementById('pendingList');
    const vehicleFilter = document.getElementById('vehicleFilter');

    // Variables para almacenar datos
    let attendanceData = [];

    // Función para cargar los datos de asistencia
    async function fetchAttendanceData() {
        try {
            const response = await fetch(`${googleAppScriptUrl}?action=getAttendances`);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Filtrar solo los registros sin hora de salida y ordenarlos por fecha de ingreso
            attendanceData = data.attendances
                .filter(record => !record.exitTime)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            filterAndDisplayData();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            pendingList.innerHTML = `<li class="no-results">Error al cargar los datos: ${error.message}</li>`;
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
}); 