import express from 'express'
import bodyParser from 'body-parser'
import { productRouter } from './routes/productos.js'
import cors from 'cors'
import { Synonyms } from './synonyms/synonyms.js'

const app = express()

app.use(bodyParser.json())
app.use(cors())
app.use('/productos', productRouter)

app.get('/', (req, res) => {
    res.send('Funcionando')
})

app.get('/prueba', async (req, res) => {
    const result = await Synonyms.ingestData()

    res.send(result)
})

app.listen(3000, () => {
    console.log('App listening on 3000')
})