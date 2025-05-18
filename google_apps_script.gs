// Función para obtener la lista de asistencias
function getAttendances() {
  console.log("Iniciando getAttendances");
  const sheetName = "AsistenciasRegistradas";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("Spreadsheet obtenida");
    
    const sheet = ss.getSheetByName(sheetName);
    console.log("Buscando hoja:", sheetName);

    if (!sheet) {
      console.error("Hoja no encontrada:", sheetName);
      return ContentService
            .createTextOutput(JSON.stringify({ error: "Hoja \'" + sheetName + "\' no encontrada." }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Obtener los datos de la hoja
    console.log("Obteniendo datos de la hoja");
    const data = sheet.getDataRange().getValues();
    console.log("Datos obtenidos, filas totales:", data.length);
    
    if (data.length <= 1) {
      console.log("No hay registros en la hoja (solo encabezados o vacía)");
      return ContentService
            .createTextOutput(JSON.stringify({ attendances: [] }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    console.log("Encabezados encontrados:", headers);

    // Encontrar los índices de las columnas
    const vehiculoIndex = headers.findIndex(header => header === "Vehículo");
    const nombreIndex = headers.findIndex(header => header === "Nombre");
    const ingresoIndex = headers.findIndex(header => header === "Fecha Hora Ingreso");
    const salidaIndex = headers.findIndex(header => header === "Fecha Hora Salida");

    console.log("Índices de columnas:", {
      vehiculo: vehiculoIndex,
      nombre: nombreIndex,
      ingreso: ingresoIndex,
      salida: salidaIndex
    });

    if (vehiculoIndex === -1 || nombreIndex === -1 || ingresoIndex === -1) {
      throw new Error("No se encontraron todas las columnas requeridas");
    }

    const attendances = data.slice(1).map(row => {
      return {
        vehicleType: row[vehiculoIndex] || '',
        driver: row[nombreIndex] || '',
        timestamp: row[ingresoIndex] || '',
        exitTime: salidaIndex !== -1 ? row[salidaIndex] || '' : ''
      };
    }).filter(record => record.driver && record.timestamp);

    console.log("Registros procesados:", attendances.length);
    
    const response = { attendances: attendances };
    console.log("Enviando respuesta con datos");
    
    return ContentService
          .createTextOutput(JSON.stringify(response))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en getAttendances: " + error.toString() + " Stack: " + error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ error: "Error interno del servidor: " + error.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

// Modificar doGet para manejar diferentes acciones
function doGet(e) {
  console.log("Iniciando doGet con parámetros:", e.parameter);
  
  try {
    if (e.parameter.action === 'getAttendances') {
      console.log("Acción solicitada: getAttendances");
      return getAttendances();
    }
    
    console.log("Acción por defecto: getDrivers");
    return getDrivers();
    
  } catch (error) {
    console.error("Error en doGet:", error.toString(), "Stack:", error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ 
            error: "Error procesando la solicitud: " + error.toString() 
          }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

function getDrivers() {
  const sheetName = "Conductores"; 
  const nameColumn = 1;
  const startRow = 2; 

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
            .createTextOutput(JSON.stringify({ error: "Hoja \'" + sheetName + "\' no encontrada." }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const range = sheet.getRange(startRow, nameColumn, sheet.getLastRow() - (startRow - 1), 1);
    const values = range.getValues();
    const drivers = values.flat().filter(name => name.toString().trim() !== "");

    return ContentService
          .createTextOutput(JSON.stringify({ drivers: drivers }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en getDrivers: " + error.toString() + " Stack: " + error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ error: "Error interno del servidor: " + error.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para crear la carpeta de fotos si no existe
function getOrCreatePhotoFolder() {
  try {
    const folderName = "Fotos_Asistencia";
    console.log("Buscando carpeta:", folderName);
    
    let folders = DriveApp.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      const folder = folders.next();
      console.log("Carpeta existente encontrada. ID:", folder.getId());
      return folder;
    } else {
      console.log("Creando nueva carpeta...");
      const newFolder = DriveApp.createFolder(folderName);
      console.log("Nueva carpeta creada. ID:", newFolder.getId());
      return newFolder;
    }
  } catch (error) {
    console.error("Error al obtener/crear carpeta:", error.toString());
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Función para guardar la foto y obtener el enlace
function savePhoto(base64Data, fileName) {
  try {
    console.log("Iniciando guardado de foto para:", fileName);
    
    if (!base64Data) {
      throw new Error("No se recibieron datos de imagen (base64Data es null o vacío)");
    }

    // Validar formato base64
    const base64Parts = base64Data.split(',');
    if (base64Parts.length !== 2) {
      throw new Error("Formato base64 inválido - no contiene la estructura esperada");
    }

    console.log("Decodificando datos base64...");
    const decodedData = Utilities.base64Decode(base64Parts[1]);
    if (!decodedData || decodedData.length === 0) {
      throw new Error("Error al decodificar datos base64");
    }

    const photoBlob = Utilities.newBlob(decodedData, 'image/jpeg', fileName);
    console.log("Blob creado correctamente. Tamaño:", photoBlob.getBytes().length);
    
    console.log("Obteniendo carpeta de fotos...");
    const folder = getOrCreatePhotoFolder();
    if (!folder) {
      throw new Error("No se pudo obtener o crear la carpeta de fotos");
    }
    console.log("Carpeta obtenida:", folder.getName(), "ID:", folder.getId());
    
    console.log("Guardando archivo...");
    const file = folder.createFile(photoBlob);
    if (!file) {
      throw new Error("Error al crear el archivo en Drive");
    }
    console.log("Archivo creado con ID:", file.getId());
    
    console.log("Configurando permisos...");
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = file.getUrl();
    console.log("URL del archivo:", url);
    return url;
  } catch (error) {
    console.error("Error detallado al guardar la foto:", error.toString());
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Función para marcar la salida de un conductor
function markExit(e) {
  console.log("Iniciando markExit");
  const sheetName = "AsistenciasRegistradas";
  
  try {
    if (!e.parameter.timestamp) {
      throw new Error("No se proporcionó el timestamp del registro");
    }

    const timestamp = e.parameter.timestamp;
    console.log("Buscando registro con timestamp:", timestamp);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Hoja no encontrada: " + sheetName);
    }

    // Obtener datos y encabezados
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar índices de columnas necesarias
    const timestampIndex = headers.findIndex(header => header === "Fecha Hora Ingreso");
    const exitIndex = headers.findIndex(header => header === "Fecha Hora Salida");

    if (timestampIndex === -1 || exitIndex === -1) {
      throw new Error("No se encontraron todas las columnas necesarias");
    }

    // Buscar la fila del registro
    const rowIndex = data.findIndex((row, index) => 
      index > 0 && row[timestampIndex] && row[timestampIndex].toString() === timestamp
    );

    if (rowIndex === -1) {
      throw new Error("No se encontró el registro especificado");
    }

    // Marcar la salida
    const now = new Date();
    sheet.getRange(rowIndex + 1, exitIndex + 1).setValue(now);

    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "success", 
            message: "Salida registrada correctamente",
            exitTime: now.toLocaleString()
          }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en markExit:", error.toString(), "Stack:", error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "error", 
            message: error.toString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

// Modificar doPost para manejar el marcaje de salida
function doPost(e) {
  console.log("Iniciando doPost con parámetros:", e.parameter);
  
  if (e.parameter.action === 'markExit') {
    return markExit(e);
  }
  
  // Si no es markExit, entonces es registro de asistencia
  try {
    // Validar parámetros recibidos
    if (!e || !e.parameter) {
      throw new Error("No se recibieron parámetros en la solicitud");
    }

    const driver = e.parameter.driver;
    const timestamp = e.parameter.timestamp;
    const vehicleType = e.parameter.vehicleType;
    const photoData = e.parameter.photo;

    // Log de datos recibidos (excepto la foto por su tamaño)
    console.log("Datos recibidos:", {
      driver: driver,
      timestamp: timestamp,
      vehicleType: vehicleType,
      photoReceived: photoData ? "Sí" : "No",
      photoLength: photoData ? photoData.length : 0
    });

    if (!driver || !timestamp || !vehicleType || !photoData) {
      const missingFields = [];
      if (!driver) missingFields.push("conductor");
      if (!timestamp) missingFields.push("timestamp");
      if (!vehicleType) missingFields.push("tipo de vehículo");
      if (!photoData) missingFields.push("foto");
      
      const errorMsg = "Faltan datos requeridos: " + missingFields.join(", ");
      console.error(errorMsg);
      return ContentService
            .createTextOutput(JSON.stringify({ 
              status: "error", 
              message: errorMsg
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Validar formato de la foto
    if (!photoData.startsWith('data:image')) {
      console.error("Formato de foto inválido. Datos recibidos no comienzan con 'data:image'");
      return ContentService
            .createTextOutput(JSON.stringify({ 
              status: "error", 
              message: "Formato de foto inválido" 
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    console.log("Preparando para guardar la foto");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "AsistenciasRegistradas";
    let sheet = ss.getSheetByName(sheetName);

    const expectedHeaders = ["Nombre", "Fecha Hora Ingreso", "Vehículo", "Foto"];
    let columnMap = {}; 

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      expectedHeaders.forEach((header, index) => {
        columnMap[header] = index + 1;
      });
    } else {
      const lastCol = sheet.getLastColumn();
      const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      currentHeaders.forEach((header, index) => {
        if (header && header.toString().trim() !== "") {
          columnMap[header] = index + 1;
        }
      });

      let nextHeaderCol = lastCol > 0 ? lastCol : 0;
      expectedHeaders.forEach(expectedHeader => {
        if (!columnMap[expectedHeader]) {
          nextHeaderCol++;
          sheet.getRange(1, nextHeaderCol).setValue(expectedHeader);
          columnMap[expectedHeader] = nextHeaderCol;
        }
      });
    }

    // Guardar la foto y obtener el enlace
    const fileName = `${driver}_${timestamp.replace(/[/:]/g, '-')}.jpg`;
    console.log("Intentando guardar foto con nombre:", fileName);
    
    let photoUrl;
    try {
      photoUrl = savePhoto(photoData, fileName);
      console.log("Foto guardada exitosamente. URL:", photoUrl);
    } catch (photoError) {
      console.error("Error al guardar la foto:", photoError);
      return ContentService
            .createTextOutput(JSON.stringify({ 
              status: "error", 
              message: "Error al guardar la foto: " + photoError.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    const nextRow = sheet.getLastRow() + 1;

    // Escribir los datos en la hoja
    if (columnMap["Nombre"]) {
      sheet.getRange(nextRow, columnMap["Nombre"]).setValue(driver);
    }
    if (columnMap["Fecha Hora Ingreso"]) {
      sheet.getRange(nextRow, columnMap["Fecha Hora Ingreso"]).setValue(timestamp);
    }
    if (columnMap["Vehículo"]) {
      sheet.getRange(nextRow, columnMap["Vehículo"]).setValue(vehicleType);
    }
    if (columnMap["Foto"]) {
      sheet.getRange(nextRow, columnMap["Foto"]).setValue(photoUrl);
    }

    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "success", 
            message: `Asistencia registrada para ${driver} (${vehicleType})`,
            photoUrl: photoUrl
          }))
          .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error en doPost:", error.toString(), "Stack:", error.stack);
    return ContentService
          .createTextOutput(JSON.stringify({ 
            status: "error", 
            message: "Error interno del servidor: " + error.toString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
  }
}
