const express= require("express")
const multer= require("multer")
const dotenv= require("dotenv")
const path= require("path")

//Solicitar de los servicios AWS S3 

const {
  S3Client,
  PutObjectCommand
} = require ("@aws-sdk/client-s3")
const { error } = require("console")

//cargar las variables de entorno

dotenv.config()

const app= express()

const PORT= process.env.PORT   
const BUCKET= process.env.AWS_S3_BUCKET
const PREFIX= process.env.AWS_S3_PREFIX || ""


const upload= multer({
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

app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.post('/upload', upload.single("archivo"), async(req, res)=> {
  try{

    if(!req.file){
      return res.status(400).json({
        success: false,
        message: 'No adjuntaste el archivo'

      })
    }
    //verificar que se haya seleccioando un archivo
    //obtener el nombre del archivo
    const fileName= req.file.originalname

    //ruta del archivo
    const key= `${PREFIX}${fileName}`
    //subir ek archivo
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
      message: 'Archivo subido correctamnete',
      Bucket: BUCKET,
      key: key
    })

  }catch(e){
    console.error(e)
    res.status(500).json({
      success: false,
      message: 'No se pudo subir el archivo',
      error: e.message
    })
  }
})

//iniciar servidor

app.listen(PORT, ()=>{
  console.log(`Servidor iniciado en: http://localhost:${PORT}`)
})