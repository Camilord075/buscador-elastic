import productos from '../mocks/productos.json' with { type: 'json' }
import { client } from '../elastic/client.js'
import { appendFile, readFile, writeFile } from 'fs/promises'
import { Synonyms } from '../synonyms/synonyms.js'

export class Searcher {
    static async createIndex() {
        const rows = productos.productos

        try {
            await Synonyms.ingestData()

            const response = await client.indices.create({
                index: 'productos',
                body: {
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 1,
                        analysis: {
                            filter: {
                                synonyms_filter: {
                                    type: 'synonym_graph',
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
                            categoria: { type: 'keyword' },
                            precio_grupo: { type: 'integer' },
                            precio_base: { type: 'integer' },
                            image: { type: 'text' },
                            cod_pais: { type: 'keyword' },
                            cod_tienda: { type: 'keyword' }
                        }
                    }
                }
            })

            rows.map(async (row) => {
                const colors = []

                if (row.color !== null) {
                    row.color.split('\/').map((color) => {
                        colors.push(color.toLowerCase())
                    })
                } else {
                    colors.push('NA')
                }

                await client.index({
                    index: 'productos',
                    id: row.id_code,
                    body: {
                        nombre: row.nombre,
                        tag: row.tag,
                        color: colors,
                        categoria: row.categoria !== null ? row.categoria.toLowerCase() : 'NA',
                        precio_grupo: row.precio_base !== null ? parseFloat(row.precio_base) : 0,
                        precio_base: row.es_grupo ? parseFloat(row.precio_base) : parseFloat(row.precio_grupo),
                        image: row.image !== null ? row.image.replaceAll('"', '') : null,
                        cod_pais: row.pais,
                        cod_tienda: row.tienda
                    }
                })
            })

            return `Indice creado correctamente: ${response.acknowledged.should}`
        } catch (error) {
            throw new Error(`Hubo un error al crear el indice: ${error.message}`)
        }
    }

    static async deleteIndex() {
        try {
            await client.indices.delete({
                index: 'productos'
            })

            return ('Indice Antiguo borrado')
        } catch (error) {
            throw new Error(`Error al eliminar el indice antiguo: ${error.message}`)
        }
    }

    static async search(query, color, categoria, startPrecio, endPrecio, orderWay, pais, tienda) {
        const consulta = query.trim()
        const consultaSplit = consulta.split(' ')
        const consultaLength = consultaSplit[0].length
        const fuzzy = consultaLength <= 4 ? 1 : 2
        
        try {
            const elasticQuery = {
                index: 'productos',
                body: {
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query: consulta,
                                        boost: 2,
                                        fields: ['nombre', 'tag'],
                                        fuzziness: fuzzy
                                    }
                                }
                            ],
                            filter: [
                                {
                                    wildcard: { cod_pais: pais }
                                }
                            ]
                        }
                    },
                    sort: [],
                    size: 10000
                }
            }

            const elasticQueryNone = {
                index: 'productos',
                body: {
                    query: {
                        bool: {
                            should: [
                                {
                                    multi_match: {
                                        query: consulta,
                                        boost: 2,
                                        fields: ['nombre', 'tag'],
                                        fuzziness: fuzzy
                                    }
                                }
                            ],
                            filter: [
                                {
                                    wildcard: { cod_pais: pais }
                                }
                            ]
                        }
                    },
                    sort: [],
                    size: 10000
                }
            }

            if (color) {
                if (!consulta) {
                    elasticQueryNone.body.query.bool.filter.push({
                        bool: {
                            should: color.split(',').map((item) => ({
                                term: { color: item.toLowerCase() }
                            })),
                            minimum_should_match: 1
                        }
                    })
                } else {
                    elasticQuery.body.query.bool.filter.push({
                        bool: {
                            should: color.split(',').map((item) => ({
                                term: { color: item.toLowerCase() }
                            })),
                            minimum_should_match: 1
                        }
                    })
                }
            }

            if (categoria) {
                if (!consulta) {
                    elasticQueryNone.body.query.bool.filter.push({
                        bool: {
                            should: categoria.split(',').map((item) => ({
                                term: { categoria: item.toLowerCase() }
                            })),
                            minimum_should_match: 1
                        }
                    })  
                } else {
                    elasticQuery.body.query.bool.filter.push({
                        bool: {
                            should: categoria.split(',').map((item) => ({
                                term: { categoria: item.toLowerCase() }
                            })),
                            minimum_should_match: 1
                        }
                    })
                }                
            }

            if (startPrecio || endPrecio) {
                const rangeFilter = {}

                if (startPrecio) rangeFilter.gte = startPrecio
                if (endPrecio) rangeFilter.lte = endPrecio

                if (!consulta) {
                    elasticQueryNone.body.query.bool.filter.push({
                        range: { precio_grupo: rangeFilter }
                    })  
                } else {
                    elasticQuery.body.query.bool.filter.push({
                        range: { precio_grupo: rangeFilter }
                    })
                }
            }

            if (orderWay) {
                const order = orderWay

                if (!consulta) {
                    elasticQueryNone.body.sort.push({
                        precio_grupo: { order }
                    })
                } else {
                    elasticQuery.body.sort.push({
                        precio_grupo: { order }
                    })
                }
            }

            if (tienda) {
                if (!consulta) {
                    elasticQueryNone.body.query.bool.filter.push({
                        term: { cod_tienda: tienda }
                    })
                } else {
                    elasticQuery.body.query.bool.filter.push({
                        term: { cod_tienda: tienda }
                    })
                }
            }

            if (!consulta) {
                const response = await client.search(elasticQueryNone)
                return response.hits.hits.map((hit) => hit._source)
            } else {
                const response = await client.search(elasticQuery)
                return response.hits.hits.map((hit) => hit._source)
            }
        } catch (error) {
            throw new Error(`Error al buscar la query: ${error.message}`)
        }
    }

    static async resetIndex() {
        try {
            await this.deleteIndex()
            await this.createIndex()

            return 'Indice reiniciado'
        } catch (error) {
            throw new Error(`Error en el reinicio: ${error.message}`)
        }
    }

    static async addDocumentToIndex({ sku, nombre, tag, color, categoria, precio, synonyms }) {
        try {
            const filePath = 'C:/Users/camil/Downloads/elasticsearch-8.16.1/config/synonyms/synonyms.txt'
            await appendFile(filePath, `\n"${nombre}",${synonyms}`)

            productos.productos.push({
                sku,
                nombre,
                tag,
                color,
                categoria,
                precio
            })

            await this.resetIndex()

            return 'Documento agregado correctamente'
        } catch (error) {
            throw new Error(`Ha ocurrido un error al agregar el documento: ${error.message}`)
        }
    }

    static async editDocument ({ sku, nombre, tag, color, categoria, precio }) {
        try {
            const colors = []
            if (color) {
                color.split('\/').map((color => {
                    colors.push(color.toLowerCase())
                }))
            }

            await client.index({
                index: 'productos',
                id: sku,
                body: {
                    nombre,
                    tag, 
                    color: colors,
                    categoria,
                    precio
                }
            })

            return 'Documento actualizado correctamente'
        } catch (error) {
            throw new Error(`Hubo un error al editar el documento: ${error.message}`)
        }
    }

    static async deleteDocument(sku) {
        const filePath = 'C:/Users/camil/Downloads/elasticsearch-8.16.1/config/synonyms/synonyms.txt'
        try {
            const product = await client.search({
                index: 'productos',
                query: {
                    terms: {
                        _id: [ sku ]
                    }
                }
            })

            const data = product.hits.hits.map((hit) => hit._source)[0]
            const document = await readFile(filePath, 'utf-8')

            const newDocument = document.split('\n').filter(linea => !linea.includes(data.nombre)).join('')

            await writeFile(filePath, newDocument, 'utf-8')
            
            await client.delete({
                index: 'productos',
                id: sku
            })

            return 'Documento eliminado correctamente'
        } catch (error) {
            throw new Error(`Ha ocurrido un error al eliminar el documento: ${error.message}`)
        }


    }
}