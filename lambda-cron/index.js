const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
    console.log("=== EJECUCIÓN DE RUTINA PROGRAMADA (CRON) ===", JSON.stringify(event, null, 2));
    
    const timestamp = new Date().toISOString();
    const registro = {
        id: Date.now(),
        mensaje: "Rutina ejecutada automáticamente por EventBridge",
        fecha: timestamp
    };

    const logPath = path.join(__dirname, '..', 'cron-logs.json');
    
    let historial = [];
    try {
        if (fs.existsSync(logPath)) {
            const data = fs.readFileSync(logPath, 'utf8');
            historial = JSON.parse(data);
        }
    } catch (e) {
        historial = [];
    }

    historial.unshift(registro);
    if (historial.length > 10) historial.pop();

    fs.writeFileSync(logPath, JSON.stringify(historial, null, 2));

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Rutina registrada con éxito", fecha: timestamp }),
    };
};