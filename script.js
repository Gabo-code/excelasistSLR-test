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

    attendanceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedDriver = driverSelect.value;
        const selectedVehicleType = vehicleTypeSelect.value;
        const submissionTimestamp = timestampInput.value;

        if (!selectedDriver) {
            messageElement.textContent = 'Por favor, selecciona un conductor.';
            messageElement.className = 'error';
            return;
        }

        if (!selectedVehicleType) {
            messageElement.textContent = 'Por favor, selecciona un tipo de vehículo.';
            messageElement.className = 'error';
            return;
        }

        messageElement.textContent = `Registrando asistencia para ${selectedDriver} (${selectedVehicleType})...`;
        messageElement.className = '';

        // Lógica para enviar datos a Google Sheets (se implementará después)
        // Por ahora, solo simulamos un registro exitoso
        // console.log('Asistencia a registrar:', { // Comentamos la simulación anterior
        //     driver: selectedDriver,
        //     timestamp: submissionTimestamp
        // });

        try {
            // Preparamos los datos como URLSearchParams
            const formData = new URLSearchParams(); 
            formData.append('driver', selectedDriver);
            formData.append('vehicleType', selectedVehicleType);
            formData.append('timestamp', submissionTimestamp);

            const response = await fetch(googleAppScriptUrl, {
                method: 'POST',
                // mode: 'cors', // Ya no es estrictamente necesario para simple requests, pero no daña
                // cache: 'no-cache',
                headers: {
                    // Ya no 'Content-Type': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded', 
                },
                // redirect: 'follow', // Puede seguir siendo útil
                body: formData.toString() // Enviamos los datos como una cadena de consulta
            });

            const result = await response.json(); // El Apps Script seguirá devolviendo JSON

            if (response.ok && result.status === 'success') {
                messageElement.textContent = result.message; 
                messageElement.className = 'success';
                attendanceForm.reset();
                updateTimestamp();
                driverSelect.value = '';
                vehicleTypeSelect.value = '';
            } else {
                throw new Error(result.message || 'Error al registrar la asistencia.');
            }

        } catch (error) {
            console.error('Error al registrar asistencia:', error);
            messageElement.textContent = `Error al registrar: ${error.message}`;
            messageElement.className = 'error';
        }

        // setTimeout(() => { // Comentamos la simulación anterior
        //     messageElement.textContent = `Asistencia registrada para ${selectedDriver} a las ${submissionTimestamp}.`;
        //     messageElement.className = 'success';
        //     attendanceForm.reset(); // Limpia el formulario
        //     updateTimestamp(); // Actualiza el timestamp para el próximo registro
        //     // Vuelve a poner la opción por defecto en el select
        //     driverSelect.value = ''; 
        // }, 1000);
    });

    // Cargar conductores y establecer el timestamp inicial
    fetchDrivers();
    updateTimestamp();
    // Actualizar el timestamp cada segundo
    setInterval(updateTimestamp, 1000);
}); 