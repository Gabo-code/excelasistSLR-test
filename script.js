document.addEventListener('DOMContentLoaded', () => {
    // Configuración de la ubicación objetivo
    const TARGET_LAT = -33.564259;
    const TARGET_LON = -70.680248;
    const MAX_DISTANCE_METERS = 50;

    // Referencias a elementos del DOM
    const mapElement = document.getElementById('map');
    const toggleMapButton = document.getElementById('toggleMapButton');
    const driverSelect = document.getElementById('driverSelect');
    const attendanceForm = document.getElementById('attendanceForm');
    const messageElement = document.getElementById('message');
    const timestampInput = document.getElementById('timestamp');
    const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');

    // URL del Google Apps Script
    const googleAppScriptUrl = 'https://script.google.com/macros/s/AKfycbzgd3dsxH6LX_RIhRiE5Porrh9IhDllN-NZs90ejXPBHJZwj_oBZU_jHEXCEEh5bhdvsg/exec';

    // Variables del mapa
    let map = null;
    let userMarker = null;
    let targetMarker = null;
    let radiusCircle = null;

    // Función para inicializar el mapa
    function initializeMap() {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
                map.setView([TARGET_LAT, TARGET_LON], 17);
            }, 100);
            return;
        }

        // Asegurarnos que el contenedor sea visible temporalmente para la inicialización
        mapElement.style.height = '400px';
        mapElement.style.opacity = '1';

        // Crear el mapa
        map = L.map('map', {
            center: [TARGET_LAT, TARGET_LON],
            zoom: 17,
            zoomControl: true,
            attributionControl: true,
            fadeAnimation: true
        });

        // Agregar capa de tiles con mejor manejo de carga
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom: 15,
            attribution: '© OpenStreetMap contributors',
            tileSize: 256,
            updateWhenIdle: false,
            updateWhenZooming: true,
            keepBuffer: 2
        }).addTo(map);

        // Agregar marcador objetivo
        targetMarker = L.marker([TARGET_LAT, TARGET_LON], {
            title: 'Ubicación Permitida'
        }).addTo(map);

        // Agregar círculo de radio
        radiusCircle = L.circle([TARGET_LAT, TARGET_LON], {
            radius: MAX_DISTANCE_METERS,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);

        // Agregar popup al marcador objetivo
        targetMarker.bindPopup('Zona de registro permitida').openPopup();

        // Restaurar el estado inicial del contenedor
        mapElement.style.height = '';
        mapElement.style.opacity = '';

        // Forzar una actualización del mapa después de la inicialización
        setTimeout(() => {
            map.invalidateSize(true);
            map.setView([TARGET_LAT, TARGET_LON], 17);
        }, 100);
    }

    // Función para mostrar/ocultar el mapa
    function toggleMap() {
        const isVisible = mapElement.classList.contains('visible');
        
        if (!isVisible) {
            // Mostrar el mapa
            mapElement.classList.add('visible');
            toggleMapButton.textContent = 'Ocultar Mapa';
            
            // Inicializar o actualizar el mapa con un retraso suficiente
            setTimeout(() => {
                if (!map) {
                    initializeMap();
                } else {
                    map.invalidateSize(true);
                    map.setView([TARGET_LAT, TARGET_LON], 17);
                }
            }, 300); // Aumentado el retraso para asegurar que la transición CSS se complete
        } else {
            // Ocultar el mapa
            mapElement.classList.remove('visible');
            toggleMapButton.textContent = 'Mostrar Mapa';
        }
    }

    // Función para actualizar el marcador del usuario
    function updateUserLocation(position) {
        const { latitude, longitude } = position.coords;

        if (userMarker) {
            userMarker.setLatLng([latitude, longitude]);
        } else {
            userMarker = L.marker([latitude, longitude], {
                title: 'Tu ubicación'
            }).addTo(map);
        }

        userMarker.bindPopup('Tu ubicación actual').openPopup();
        map.setView([latitude, longitude], map.getZoom());
    }

    // Función para calcular distancia (Haversine)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la tierra en metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // Función para actualizar el timestamp
    function updateTimestamp() {
        const now = new Date();
        timestampInput.value = now.toLocaleString('es-ES');
    }

    // Función para cargar conductores
    async function fetchDrivers() {
        try {
            const response = await fetch(googleAppScriptUrl);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const drivers = data.drivers;
            driverSelect.innerHTML = '<option value="">-- Selecciona un conductor --</option>';
            drivers.forEach(driver => {
                if (driver) {
                    const option = document.createElement('option');
                    option.value = driver;
                    option.textContent = driver;
                    driverSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error al cargar conductores:', error);
            messageElement.textContent = 'Error al cargar la lista de conductores';
            messageElement.className = 'error';
        }
    }

    // Event Listeners
    toggleMapButton.addEventListener('click', toggleMap);

    attendanceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.textContent = 'Verificando ubicación...';
        messageElement.className = '';

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const distance = calculateDistance(
                position.coords.latitude,
                position.coords.longitude,
                TARGET_LAT,
                TARGET_LON
            );

            if (distance > MAX_DISTANCE_METERS) {
                throw new Error(`Ubicación fuera del rango permitido (${Math.round(distance)}m)`);
            }

            // Actualizar mapa si está visible
            if (mapElement.classList.contains('visible')) {
                updateUserLocation(position);
            }

            // Preparar datos del formulario
            const formData = new URLSearchParams();
            formData.append('driver', driverSelect.value);
            formData.append('vehicleType', vehicleTypeSelect.value);
            formData.append('timestamp', timestampInput.value);

            // Enviar datos
            const response = await fetch(googleAppScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                messageElement.textContent = 'Asistencia registrada correctamente';
                messageElement.className = 'success';
                attendanceForm.reset();
                updateTimestamp();
            } else {
                throw new Error(result.message || 'Error al registrar la asistencia');
            }
        } catch (error) {
            console.error('Error:', error);
            messageElement.textContent = `Error: ${error.message}`;
            messageElement.className = 'error';
        }
    });

    // Inicialización
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    fetchDrivers();
}); 