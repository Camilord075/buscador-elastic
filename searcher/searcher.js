import productos from '../mocks/productos.json' assert { type: 'json' }
import { client } from '../elastic/client.js'

export class Searcher {
    static async createIndex() {
        const rows = productos.productos

        try {
            const response = await client.indices.create({
                index: 'productos',
                body: {
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 1,
                        analysis: {
                            filter: {
                                synonyms_filter: {
                                    type: 'synonym',
                                    synonyms_path: 'synonyms/synonyms.txt'
                                }
                            },
                            analyzer: {
                                synonym_analizer: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'synonyms_filter']
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            nombre: {
                                type: 'text',
                                analyzer: 'synonym_analizer'
                            },
                            tag: {
                                type: 'text',
                                analyzer: 'synonym_analizer'
                            },
                            color: { type: 'keyword' },
                            categoria: { type: 'keyword' }
                        }
                    }
                }
            })

            rows.map(async (row) => {
                const colors = []

                row.color.split('/').map((color) => {
                    colors.push(color.toLowerCase())
                })

                await client.index({
                    index: 'productos',
                    id: row.sku,
                    body: {
                        nombre: row.nombre,
                        tag: row.tag,
                        color: colors,
                        categoria: row.categoria.toLowerCase()
                    }
                })
            })

            return `Indice creado correctamente ${response}`
        } catch (error) {
            throw new Error('Hubo un error al crear el indice')
        }
    }

    static async deleteIndex() {
        try {
            await client.indices.delete({
                index: 'productos'
            })

            return ('Indice Antiguo borrado')
        } catch (error) {
            throw new Error('Error al eliminar el indice antiguo')
        }
    }

    static async search(query, color, categoria) {
        if (!query) throw new Error('Falta el valor a buscar')
        
        try {
            const elasticQuery = {
                index: 'productos',
                body: {
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query,
                                        fields: ['nombre', 'tag'],
                                        fuzziness: 2
                                    }
                                }
                            ],
                            filter: []
                        }
                    }
                }
            }

            if (color) {
                elasticQuery.body.query.bool.filter.push({
                    wildcard: { color: `*${color.toLowerCase()}*` }
                })
            }

            if (categoria) {
                elasticQuery.body.query.bool.filter.push({
                    wildcard: { categoria: `*${categoria.toLowerCase()}*` }
                })
            }

            const response = await client.search(elasticQuery)

            return response.hits.hits.map((hit) => hit._source)
        } catch (error) {
            throw new Error('Error al buscar la query')
        }
    }
}