import { URL } from 'url'
const { getRatingBetween, injest,deleteAllRatings } = require('./neo4j')
const rawData = require('./raw-data.json')

const main = async () => {
  const response = await getRatingBetween('13742', '361')
  console.log(response)
}

const getImageResolutions = (asset) => {
  if (!asset.images) { return [] }

  const images = []
  asset.images.forEach(image => {
    image.aspectRatio?.forEach(aspectRatio => {
      aspectRatio.resolutions?.forEach(resolution => {
        const height = resolution.height
        const width = resolution.width
        const url = resolution.url
        const enlightImageObject = { width, height, url }
        images.push(enlightImageObject)
      })
    })
  })

  return images
}

function convertCosineSimilarityToPercentage(cosineSimilarity) {
  if (cosineSimilarity < -1.0 || cosineSimilarity > 1.0) {
    console.warn("Cosine similarity is typically between -1.0 and 1.0. Input value is outside this range.");
  }

  const normalizedSimilarity = (cosineSimilarity + 1) / 2;

  const percentage = normalizedSimilarity * 100
  return (percentage + 20).toFixed(2);
}

const fetchFeed = async (req) => {
  const availableFeed = require('./feed.json')
  const feedId = req?.params?.id?.toUpperCase()
  const rawContent = rawData.data.listAssets.items

  const url = new URL(req.url)
  const queryStringParameters = Object.fromEntries(url.searchParams)
  const lastWatchedItem = queryStringParameters?.lastWatchedItem

  let feed = []

  for (const item of rawContent) {
    if (availableFeed[feedId].includes(item.id)) {
      const images = getImageResolutions(item)
      const asset = {
        id: item.id,
        title: item.title,
        description: item.description,
        genre: item.genres?.map(g => g?.name),
        image: images?.find(i => i.height === 360 && i.width === 640)?.url,
        cast: item.credits?.map(c => c?.person?.name)
      }

      if (lastWatchedItem) {
        const lastWatchedGId=  lastWatchedItem?.replaceAll("de","")
        const currentItemGId = item.id?.replaceAll("de","")
        asset.rating = await getRatingBetween(lastWatchedGId, currentItemGId)
        if (asset.rating) {
          asset.percentage = convertCosineSimilarityToPercentage(asset.rating)
        } else {
          asset.percentage = Math.floor(Math.random() * 20) + 1;
        }
      }
      feed.push(asset)
    }
  }

  feed = feed.sort((a,b) => b.rating - a.rating)

  const id = feedId.split('_').map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()).join(' ')
  return Response.json({ id, content: feed }, {
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173', // Replace with your frontend origin
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // Cache preflight results for 24 hours
    }
  })
}

const routes = {
  '/feed/:id': {
    GET: fetchFeed
  },
  '/injest': {
    GET: async () => {
      await deleteAllRatings()
      await injest(false)
    }
  }
}

Bun.serve({
  port: 3000,
  routes,
  error (error) {
    console.error(error)
    return Response.json({ message: 'Internal Server Error' }, { status: 500 })
  }
})
