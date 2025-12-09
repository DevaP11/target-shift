const data = require('./raw-data.json')
const fs = require('fs')
const injestCsv = fs.createWriteStream('movies.csv')
injestCsv.write('item_id,title,description,cast,genres\n')

const main = async () => {
  data.data.listAssets.items.forEach(item => {
    const title = item.title.replaceAll(',', '')
    const description = item.description.replaceAll(',', ':')
    const genres = item.genres?.map(g => g.name)?.join('|')?.replaceAll(',', ':')
    const cast = item.credits?.map(c => c?.person?.name)?.join('|')?.replaceAll(',', ':')
    const itemId = item.id?.replaceAll('de', '')

    if (isNaN(parseInt(itemId))) parseInt(itemId)
    injestCsv.write(`${itemId},${title},${description},${cast},${genres}\n`)
  })
}

main()
