document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // Referencias a elementos del DOM
    const attendanceList = document.getElementById('attendanceList');
    const driverFilter = document.getElementById('driverFilter');
    const dateFilter = document.getElementById('dateFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');
    const photoModal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');

    // Variables para almacenar datos
    let attendanceData = [];
    let drivers = new Set();

    // Función para cargar los datos de asistencia
    async function fetchAttendanceData() {
        try {
            const response = await fetch(`${googleAppScriptUrl}?action=getAttendances`);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            attendanceData = data.attendances || [];
            
            // Actualizar lista de conductores para el filtro
            attendanceData.forEach(record => {
                if (record.driver) {
                    drivers.add(record.driver);
                }
            });

            updateDriverFilter();
            filterAndDisplayData();

        } catch (error) {
            console.error('Error al cargar datos:', error);
            attendanceList.innerHTML = `<tr><td colspan="4">Error al cargar los datos: ${error.message}</td></tr>`;
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
        const selectedDate = dateFilter.value;
        const selectedVehicle = vehicleFilter.value;

        const filteredData = attendanceData.filter(record => {
            if (selectedDriver && record.driver !== selectedDriver) return false;
            if (selectedVehicle && record.vehicleType !== selectedVehicle) return false;
            if (selectedDate) {
                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                if (recordDate !== selectedDate) return false;
            }
            return true;
        });

        displayAttendanceData(filteredData);
    }

    // Función para mostrar los datos en la tabla
    function displayAttendanceData(data) {
        if (!data.length) {
            attendanceList.innerHTML = '<tr><td colspan="4">No se encontraron registros</td></tr>';
            return;
        }

        attendanceList.innerHTML = data.map(record => `
            <tr>
                <td>${record.driver}</td>
                <td>${new Date(record.timestamp).toLocaleString('es-ES')}</td>
                <td>${record.vehicleType}</td>
                <td>
                    ${record.photoUrl ? 
                        `<img src="${record.photoUrl}" class="photo-preview" onclick="showPhotoModal('${record.photoUrl}')" alt="Foto de ${record.driver}">` :
                        'No disponible'}
                </td>
            </tr>
        `).join('');
    }

    // Función para mostrar la foto en modal
    window.showPhotoModal = function(url) {
        modalImage.src = url;
        photoModal.style.display = 'flex';
    };

    // Cerrar modal al hacer clic fuera de la imagen
    photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
            photoModal.style.display = 'none';
        }
    });

    // Event listeners para filtros
    driverFilter.addEventListener('change', filterAndDisplayData);
    dateFilter.addEventListener('change', filterAndDisplayData);
    vehicleFilter.addEventListener('change', filterAndDisplayData);

    // Cargar datos iniciales
    fetchAttendanceData();
}); 