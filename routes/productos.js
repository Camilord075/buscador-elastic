import { Router } from "express";
import { Searcher } from "../searcher/searcher.js";

export const productRouter = Router()

productRouter.post('/create-index', async (req, res) => {
    try {
        const result = await Searcher.createIndex()

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.get('/search', async (req, res) => {
    const { query, color, categoria, startPrecio, endPrecio, order, tienda } = req.query

    const consulta = !query ? "" : query
    const pais = 'JA'

    try {
        const result = await Searcher.search(consulta, color, categoria, startPrecio, endPrecio, order, pais, tienda)

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.delete('/delete-index', async (req, res) => {
    try {
        const result = await Searcher.deleteIndex()

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.post('/reset-index', async (req, res) => {
    try {
        const result = await Searcher.resetIndex()

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.post('/add-document', async (req, res) => {
    const { sku, nombre, tag, color, categoria, precio, synonyms } = req.body

    try {
        const result = await Searcher.addDocumentToIndex({ sku, nombre, tag, color, categoria, precio, synonyms })

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.put('/edit-document', async (req, res) => {
    const { sku, nombre, tag, color, categoria, precio } = req.body

    try {
        const result = await Searcher.editDocument({ sku, nombre, tag, color, categoria, precio })

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.delete('/delete-document', async (req, res) => {
    const { sku } = req.body

    try {
        const result = await Searcher.deleteDocument(sku)

        res.send(result)
    } catch (error) {
        res.status(500).send(error.message)
    }
})