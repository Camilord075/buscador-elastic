import express from 'express'
import productos from './mocks/productos.json' assert { type: 'json' }
import bodyParser from 'body-parser'
import { productRouter } from './routes/productos.js'

const app = express()

app.use(bodyParser.json())
app.use('/productos', productRouter)

app.get('/', (req, res) => {
    res.send('Funcionando')
})

app.listen(3000, () => {
    console.log('App listening on 3000')
})