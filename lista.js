document.addEventListener('DOMContentLoaded', () => {
    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';
    console.log('Inicializando lista.js con URL:', googleAppScriptUrl);

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
        console.log('Iniciando fetchAttendanceData...');
        try {
            const url = `${googleAppScriptUrl}?action=getAttendances`;
            console.log('Realizando fetch a:', url);
            
            const response = await fetch(url);
            console.log('Respuesta recibida, status:', response.status);
            
            if (!response.ok) {
                console.error('Respuesta no OK:', response.status, response.statusText);
                throw new Error('Error en la respuesta del servidor');
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (data.error) {
                console.error('Error en los datos:', data.error);
                throw new Error(data.error);
            }

            attendanceData = data.attendances || [];
            console.log('Asistencias cargadas:', attendanceData.length, 'registros');
            
            // Actualizar lista de conductores para el filtro
            attendanceData.forEach(record => {
                if (record.driver) {
                    drivers.add(record.driver);
                    console.log('Conductor añadido al filtro:', record.driver);
                }
            });

            console.log('Total de conductores únicos:', drivers.size);
            updateDriverFilter();
            filterAndDisplayData();

        } catch (error) {
            console.error('Error detallado en fetchAttendanceData:', error);
            console.error('Stack trace:', error.stack);
            attendanceList.innerHTML = `<tr><td colspan="4">Error al cargar los datos: ${error.message}</td></tr>`;
        }
    }

    // Función para actualizar el filtro de conductores
    function updateDriverFilter() {
        console.log('Actualizando filtro de conductores...');
        const currentValue = driverFilter.value;
        driverFilter.innerHTML = '<option value="">Todos</option>';
        
        const sortedDrivers = Array.from(drivers).sort();
        console.log('Conductores ordenados:', sortedDrivers);
        
        sortedDrivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver;
            option.textContent = driver;
            if (driver === currentValue) {
                option.selected = true;
            }
            driverFilter.appendChild(option);
        });
        console.log('Filtro de conductores actualizado');
    }

    // Función para filtrar y mostrar datos
    function filterAndDisplayData() {
        console.log('Iniciando filtrado de datos...');
        const selectedDriver = driverFilter.value;
        const selectedDate = dateFilter.value;
        const selectedVehicle = vehicleFilter.value;

        console.log('Filtros seleccionados:', {
            conductor: selectedDriver || 'todos',
            fecha: selectedDate || 'todas',
            vehiculo: selectedVehicle || 'todos'
        });

        const filteredData = attendanceData.filter(record => {
            if (selectedDriver && record.driver !== selectedDriver) return false;
            if (selectedVehicle && record.vehicleType !== selectedVehicle) return false;
            if (selectedDate) {
                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                if (recordDate !== selectedDate) return false;
            }
            return true;
        });

        console.log('Registros después del filtrado:', filteredData.length);
        displayAttendanceData(filteredData);
    }

    // Función para mostrar los datos en la tabla
    function displayAttendanceData(data) {
        console.log('Mostrando datos en la tabla, registros:', data.length);
        if (!data.length) {
            console.log('No hay datos para mostrar');
            attendanceList.innerHTML = '<tr><td colspan="4">No se encontraron registros</td></tr>';
            return;
        }

        attendanceList.innerHTML = data.map(record => {
            console.log('Procesando registro:', record);
            return `
                <tr>
                    <td>${record.driver || 'N/A'}</td>
                    <td>${record.timestamp ? new Date(record.timestamp).toLocaleString('es-ES') : 'N/A'}</td>
                    <td>${record.vehicleType || 'N/A'}</td>
                    <td>
                        ${record.photoUrl ? 
                            `<img src="${record.photoUrl}" class="photo-preview" onclick="showPhotoModal('${record.photoUrl}')" alt="Foto de ${record.driver}">` :
                            'No disponible'}
                    </td>
                </tr>
            `;
        }).join('');
        console.log('Tabla actualizada');
    }

    // Función para mostrar la foto en modal
    window.showPhotoModal = function(url) {
        console.log('Mostrando modal con URL:', url);
        modalImage.src = url;
        photoModal.style.display = 'flex';
    };

    // Cerrar modal al hacer clic fuera de la imagen
    photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
            console.log('Cerrando modal');
            photoModal.style.display = 'none';
        }
    });

    // Event listeners para filtros
    driverFilter.addEventListener('change', () => {
        console.log('Filtro de conductor cambiado:', driverFilter.value);
        filterAndDisplayData();
    });
    
    dateFilter.addEventListener('change', () => {
        console.log('Filtro de fecha cambiado:', dateFilter.value);
        filterAndDisplayData();
    });
    
    vehicleFilter.addEventListener('change', () => {
        console.log('Filtro de vehículo cambiado:', vehicleFilter.value);
        filterAndDisplayData();
    });

    // Cargar datos iniciales
    console.log('Iniciando carga de datos...');
    fetchAttendanceData();
}); 