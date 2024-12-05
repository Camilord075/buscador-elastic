import { appendFile } from 'fs/promises'
import productos from '../mocks/productos.json' with { type: 'json' }

export class Synonyms {
    static fragmentData() {
        const datos = productos.productos
        const dataFragmented = []
        const limit = 1000
        const dataArray = []

        datos.map((dato) => {
            if (dataArray.length === limit) {
                dataFragmented.push(dataArray)
                dataArray.splice(0, dataArray.length)
            } else {
                dataArray.push(dato)
            }
        })

        dataFragmented.push(dataArray)

        return dataFragmented
    }

    static async ingestData() {
        const datos = this.fragmentData()
        let numero = 0

        datos.forEach((dato) => {
            numero += dato.length
            dato.map(async (row) => {
                if (row.keywords.endsWith(',')){
                    let palabra = row.keywords.slice(0, -1)
                    await appendFile('C:/Users/camil/Downloads/elasticsearch-8.16.1/config/synonyms/synonyms.txt', `\n"${row.nombre} => ${palabra.replaceAll(',', ', ')}"`)
                } else {
                    await appendFile('C:/Users/camil/Downloads/elasticsearch-8.16.1/config/synonyms/synonyms.txt', `\n"${row.nombre} => ${row.keywords.replaceAll(',', ', ')}"`)
                }
                
            })
        })

        console.log(numero)
    }
}