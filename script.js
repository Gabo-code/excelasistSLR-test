document.addEventListener('DOMContentLoaded', () => {
    const driverSelect = document.getElementById('driverSelect');
    const attendanceForm = document.getElementById('attendanceForm');
    const messageElement = document.getElementById('message');
    const timestampInput = document.getElementById('timestamp');
    const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');

    // ACTUALIZA ESTA URL con el enlace CSV de tu Google Sheet publicado
    // const googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6ifdAUSWlHN9iBFQFMploTQxJEjlH-LfQbmLsqbUDiaarDu4ycFykggNw2lKKPWrMRHV2R2BT6KZy/pub?gid=0&single=true&output=csv'; // Ejemplo: 'https://docs.google.com/spreadsheets/d/e/ID_UNICO/pub?gid=0&single=true&output=csv'
    // NUEVA URL: Reemplaza esto con la URL de tu Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // --- Inicio: Configuración de Geolocalización ---
    const TARGET_LAT = -33.564259;
    const TARGET_LON = -70.680248;
    const MAX_DISTANCE_METERS = 50;
    // --- Fin: Configuración de Geolocalización ---

    function updateTimestamp() {
        const now = new Date();
        timestampInput.value = now.toLocaleString('es-ES');
    }

    async function fetchDrivers() {
        if (googleAppScriptUrl === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
            console.error('Por favor, actualiza la URL de Google Apps Script en script.js');
            driverSelect.innerHTML = '<option value="">Error al cargar: URL de App Script no configurada</option>';
            return;
        }

        try {
            // const response = await fetch(googleSheetCsvUrl); // Línea original comentada
            const response = await fetch(googleAppScriptUrl); // Usamos la nueva URL
            if (!response.ok) {
                throw new Error(`Error al obtener los datos: ${response.statusText}`);
            }
            // const csvData = await response.text(); // Ya no esperamos CSV
            const data = await response.json(); // Esperamos JSON del Apps Script

            if (data.error) {
                throw new Error(data.error);
            }
            
            const drivers = data.drivers; // Obtenemos el array de conductores directamente

            // Asumimos que la primera fila es el encabezado y los nombres están en la primera columna
            // const drivers = rows.slice(1).map(row => { // Lógica anterior para CSV comentada
            //     const columns = row.split(',');
            //     return columns[0].trim(); 
            // }).filter(name => name); // Filtra nombres vacíos

            driverSelect.innerHTML = '<option value="">-- Selecciona un conductor --</option>'; // Opción por defecto
            drivers.forEach(driver => {
                if (driver) { // Asegurarse de que el conductor no esté vacío
                    const option = document.createElement('option');
                    option.value = driver;
                    option.textContent = driver;
                    driverSelect.appendChild(option);
                }
            });

        } catch (error) {
            console.error('Error al cargar conductores:', error);
            driverSelect.innerHTML = '<option value="">Error al cargar conductores</option>';
            messageElement.textContent = 'No se pudieron cargar los conductores. Verifica la URL y la configuración de la hoja.';
            messageElement.className = 'error';
        }
    }

    // --- Inicio: Funciones de Geolocalización y Distancia ---
    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const phi1 = toRadians(lat1);
        const phi2 = toRadians(lat2);
        const deltaPhi = toRadians(lat2 - lat1);
        const deltaLambda = toRadians(lon2 - lon1);

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distancia en metros
    }

    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada por este navegador.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
    }
    // --- Fin: Funciones de Geolocalización y Distancia ---

    attendanceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        messageElement.textContent = 'Verificando ubicación...';
        messageElement.className = '';
        // Deshabilitar botón mientras se procesa para evitar envíos múltiples
        const submitButton = attendanceForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const position = await getCurrentLocation();
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            const distance = calculateDistance(userLat, userLon, TARGET_LAT, TARGET_LON);

            if (distance > MAX_DISTANCE_METERS) {
                throw new Error(`Ubicación fuera del rango permitido. Distancia: ${distance.toFixed(0)}m.`);
            }

            messageElement.textContent = `Ubicación verificada (a ${distance.toFixed(0)}m). Registrando asistencia...`;
            // Si la ubicación es correcta, procede con el registro
            const selectedDriver = driverSelect.value;
            const selectedVehicleType = vehicleTypeSelect.value; 
            const submissionTimestamp = timestampInput.value;
    
            if (!selectedDriver) {
                throw new Error('Por favor, selecciona un conductor.');
            }
    
            if (!selectedVehicleType) { 
                throw new Error('Por favor, selecciona un tipo de vehículo.');
            }
            
            // Preparamos los datos como URLSearchParams
            const formData = new URLSearchParams(); 
            formData.append('driver', selectedDriver);
            formData.append('vehicleType', selectedVehicleType); 
            formData.append('timestamp', submissionTimestamp);
    
            const response = await fetch(googleAppScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', 
                },
                body: formData.toString() 
            });
    
            const result = await response.json(); 
    
            if (response.ok && result.status === 'success') {
                messageElement.textContent = result.message; 
                messageElement.className = 'success';
                attendanceForm.reset();
                updateTimestamp();
                driverSelect.value = '';
                vehicleTypeSelect.value = ''; 
            } else {
                throw new Error(result.message || 'Error al registrar la asistencia desde el servidor.');
            }

        } catch (error) {
            console.error('Error en el proceso de asistencia:', error);
            messageElement.textContent = `Error: ${error.message}`;
            messageElement.className = 'error';
        } finally {
            submitButton.disabled = false; // Volver a habilitar el botón
        }
    });

    // Cargar conductores y establecer el timestamp inicial
    fetchDrivers();
    updateTimestamp();
    // Actualizar el timestamp cada segundo
    setInterval(updateTimestamp, 1000);
}); 