exports.handler = async (event) => {
    console.log("=== EVENTO RECIBIDO DE S3/SNS/SQS ===", JSON.stringify(event, null, 2));
    
    for (const record of event.Records) {
        let body = record.body;
        try {
            // Si el mensaje viene encapsulado por SNS dentro de SQS
            const parsed = JSON.parse(record.body);
            if (parsed.Message) {
                body = JSON.parse(parsed.Message);
            }
        } catch (e) {
            // El mensaje ya estaba en formato plano
        }
        
        console.log("Archivo procesado por Lambda exitosamente:", body);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Notificación procesada por Lambda correctamente" }),
    };
};