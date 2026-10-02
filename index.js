const express = require("express")
const multer = require("multer")
const dotenv = require("dotenv")
const path = require("path")
const fs = require('fs')
const { execSync } = require('child_process')

// Solicitar servicios AWS S3 y Lambda
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
} = require("@aws-sdk/client-s3")

const { 
  LambdaClient, 
  CreateFunctionCommand, 
  GetFunctionCommand 
} = require("@aws-sdk/client-lambda")

const { error } = require("console")

// Cargar las variables de entorno
dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000   
const BUCKET = process.env.AWS_S3_BUCKET
const PREFIX = process.env.AWS_S3_PREFIX || ""

const upload = multer({
  storage: multer.memoryStorage()
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
})

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL || "http://localhost:4566",
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test"
  },
  forcePathStyle: true
})

app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.post('/upload', upload.single("archivo"), async(req, res)=> {
  try {
    if(!req.file){
      return res.status(400).json({
        success: false,
        message: 'No adjuntaste el archivo'
      })
    }

    const fileName = req.file.originalname
    const key = `${PREFIX}${fileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    })

    await s3Client.send(command)
    console.log(`Archivo subido: ${key}`)

    res.json({
      success: true,
      message: 'Archivo subido correctamente',
      Bucket: BUCKET,
      key: key
    })

  } catch(e) {
    console.error(e)
    res.status(500).json({
      success: false,
      message: 'No se pudo subir el archivo',
      error: e.message
    })
  }
})

// Lectura desde AWS S3
app.get("/api/archivos", async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX
    })

    const data = await s3Client.send(command)

    const archivos = (data.Contents || [])
      .filter(objecto => objecto.Key !== PREFIX)
      .map(objeto => ({
        nombre: objeto.Key.replace(PREFIX, ""),
        key: objeto.Key,
        tamano: objeto.Size,
        fecha: objeto.LastModified
      }))

      res.json({
        success: true,
        bucket: BUCKET,
        prefijo: PREFIX,
        total: archivos.length,
        archivos: archivos
      })

  } catch(e) {
    console.error(`Error al listar archivos: `, e)
    res.status(500).json({
      success: false,
      message: 'No se puede acceder a los archivos',
      error: e.message
    })
  }
})

// Ruta para que la web lea las ejecuciones automáticas de la Actividad 2
app.get('/api/cron-logs', (req, res) => {
    const logPath = path.join(__dirname, 'cron-logs.json');

    try {
        if (fs.existsSync(logPath)) {
            const data = fs.readFileSync(logPath, 'utf8');
            res.json({ success: true, registros: JSON.parse(data) });
        } else {
            res.json({ success: true, registros: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Error al leer los logs del cron" });
    }
});

// Función para registrar automáticamente la Lambda de la Actividad 2 en LocalStack
async function desplegarLambdaAutomatica() {
    const functionName = "rutina-cron-lambda";
    
    try {
        await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
        console.log(`[Lambda] La función '${functionName}' ya se encuentra registrada en LocalStack.`);
        return;
    } catch (error) {
        console.log(`[Lambda] La función '${functionName}' no existe. Registrándola automáticamente...`);
    }

    try {
        const actividadDir = path.join(__dirname, 'lambda-cron');
        const indexPath = path.join(actividadDir, 'index.js');
        const zipPath = path.join(__dirname, 'function-temp.zip');

        if (!fs.existsSync(indexPath)) {
            console.log("[Lambda] No se encontró 'actividad-2/index.js'. Omitiendo auto-despliegue.");
            return;
        }

        // Comprimir la carpeta de la actividad en un zip temporal
        execSync(`powershell -Command "Compress-Archive -Path '${actividadDir}\\*' -DestinationPath '${zipPath}' -Force"`);

        const zipFileBuffer = fs.readFileSync(zipPath);

        const command = new CreateFunctionCommand({
            FunctionName: functionName,
            Runtime: "nodejs18.x",
            Role: "arn:aws:iam::000000000000:role/lambda-role",
            Handler: "index.handler",
            Code: { ZipFile: zipFileBuffer }
        });

        await lambdaClient.send(command);
        console.log(`[Lambda] ¡Función '${functionName}' creada exitosamente en LocalStack!`);

        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    } catch (e) {
        console.error("[Lambda] Error al desplegar automáticamente la función:", e.message);
    }
}

// Iniciar servidor y ejecutar autodespliegue de la Lambda
app.listen(PORT, async () => {
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
  await desplegarLambdaAutomatica()
})