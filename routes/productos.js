import { Router } from "express";
import { client } from "../elastic/client.js";
import productos from '../mocks/productos.json' assert { type: 'json' }
import nlp from "compromise";


export const productRouter = Router()

productRouter.post('/create-index', async (req, res) => {
    const rows = productos.productos

    try {
        const response = await client.indices.create({
            index: 'productos',
            body: {
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 1
                },
                mappings: {
                    properties: {
                        nombre: { type: 'text' },
                        tag: { type: 'text' }
                    }
                }
            }
        })

        rows.map(async (row) => {
            await client.index({
                index: 'productos',
                id: row.sku,
                body: {
                    nombre: row.nombre,
                    tag: row.tag
                }
            })
        })

        res.send(response)
    } catch (error) {
        res.status(500).send(error.message)
    }
})

productRouter.get('/search', async (req, res) => {
    const { query } = req.query

    if (!query) return res.status(500).send('Falta el parámetro de consulta')
    
    try {
        const doc = nlp(query)
        const terms = doc.terms().out('array')

        const elasticQuery = {
            index: 'productos',
            body: {
                query: {
                    bool: {
                        should: [
                            { match: { nombre: query } },
                            { match: { tag: query } },
                            { terms: { nombre: terms } },
                            { terms: { tag: terms } },
                            {
                                wildcard: {
                                    nombre: `${query}*`
                                }
                            },
                            {
                                wildcard: {
                                    tag: `${query}*`
                                }
                            },
                            {
                                fuzzy: {
                                    nombre: {
                                        value: query,
                                        fuzziness: 2
                                    } 
                                }
                            },
                            {
                                fuzzy: {
                                    tag: {
                                        value: query,
                                        fuzziness: 2
                                    }
                                }
                            },
                        ]
                    }
                }
            }
        }

        const response = await client.search(elasticQuery)

        res.send(response.hits.hits.map((hit) => hit._source))
    } catch (error) {
        res.status(500).send(error.message)
    }
})