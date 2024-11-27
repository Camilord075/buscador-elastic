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
    const { query, color, categoria } = req.query

    try {
        const result = await Searcher.search(query, color, categoria)

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