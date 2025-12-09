// Neo4j Movie Rating System - CRUD Operations
// npm install neo4j-driver

const neo4j = require('neo4j-driver')

// Initialize Neo4j driver
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'Password@1')
)

// Helper function to get session
function getSession () {
  return driver.session({ database: 'neo4j' })
}

// ==================== CREATE ====================

// Create a movie node
async function createMovie (assetId, year, genre) {
  const session = getSession()
  try {
    const result = await session.run(
      'CREATE (m:Movie {assetId: $assetId, year: $year, genre: $genre}) RETURN m',
      { assetId, year, genre }
    )
    return result.records[0].get('m').properties
  } finally {
    await session.close()
  }
}

// Create a rating relationship between two movies
async function createRating (fromassetId, toassetId, rating) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie {assetId: $fromassetId})
       MATCH (m2:Movie {assetId: $toassetId})
       MERGE (m1)-[r:RATES {score: $rating}]->(m2)
       RETURN m1.assetId AS from, m2.assetId AS to, r.score AS rating`,
      { fromassetId, toassetId, rating }
    )
    return result.records[0]
      ? {
          from: result.records[0].get('from'),
          to: result.records[0].get('to'),
          rating: result.records[0].get('rating')
        }
      : null
  } finally {
    await session.close()
  }
}

// ==================== READ ====================

// Get all movies
async function getAllMovies () {
  const session = getSession()
  try {
    const result = await session.run('MATCH (m:Movie) RETURN m')
    return result.records.map(r => r.get('m').properties)
  } finally {
    await session.close()
  }
}

// Get a specific movie by assetId
async function getMovie (assetId) {
  const session = getSession()
  try {
    const result = await session.run(
      'MATCH (m:Movie {assetId: $assetId}) RETURN m',
      { assetId }
    )
    return result.records[0] ? result.records[0].get('m').properties : null
  } finally {
    await session.close()
  }
}

// Get all ratings given by a movie
async function getRatingsFrom (assetId) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie {assetId: $assetId})-[r:RATES]->(m2:Movie)
       RETURN m2.assetId AS movie, r.score AS rating
       ORDER BY r.score DESC`,
      { assetId }
    )
    return result.records.map(r => ({
      movie: r.get('movie'),
      rating: r.get('rating')
    }))
  } finally {
    await session.close()
  }
}

// Get all ratings received by a movie
async function getRatingsTo (assetId) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie)-[r:RATES]->(m2:Movie {assetId: $assetId})
       RETURN m1.assetId AS movie, r.score AS rating
       ORDER BY r.score DESC`,
      { assetId }
    )
    return result.records.map(r => ({
      movie: r.get('movie'),
      rating: r.get('rating')
    }))
  } finally {
    await session.close()
  }
}

// Get rating between two specific movies
async function getRatingBetween (fromassetId, toassetId) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie {assetId: $fromassetId})-[r:RATES]->(m2:Movie {assetId: $toassetId})
       RETURN r.score AS rating`,
      { fromassetId, toassetId }
    )
    return result.records[0] ? result.records[0].get('rating') : null
  } finally {
    await session.close()
  }
}

// Get movies with highest average ratings received
async function getTopRatedMovies (limit = 10) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m:Movie)<-[r:RATES]-()
       RETURN m.assetId AS assetId, avg(r.score) AS avgRating, count(r) AS ratingCount
       ORDER BY avgRating DESC
       LIMIT $limit`,
      { limit: neo4j.int(limit) }
    )
    return result.records.map(r => ({
      assetId: r.get('assetId'),
      avgRating: r.get('avgRating'),
      ratingCount: r.get('ratingCount').toNumber()
    }))
  } finally {
    await session.close()
  }
}

// ==================== UPDATE ====================

// Update movie properties
async function updateMovie (assetId, updates) {
  const session = getSession()
  try {
    const setClauses = Object.keys(updates)
      .map(key => `m.${key} = $${key}`)
      .join(', ')

    const result = await session.run(
      `MATCH (m:Movie {assetId: $assetId})
       SET ${setClauses}
       RETURN m`,
      { assetId, ...updates }
    )
    return result.records[0] ? result.records[0].get('m').properties : null
  } finally {
    await session.close()
  }
}

// Update rating between two movies
async function updateRating (fromassetId, toassetId, newRating) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie {assetId: $fromassetId})-[r:RATES]->(m2:Movie {assetId: $toassetId})
       SET r.score = $newRating
       RETURN r.score AS rating`,
      { fromassetId, toassetId, newRating }
    )
    return result.records[0] ? result.records[0].get('rating') : null
  } finally {
    await session.close()
  }
}

// ==================== DELETE ====================

// Delete a movie and all its ratings
async function deleteMovie (assetId) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m:Movie {assetId: $assetId})
       DETACH DELETE m
       RETURN count(m) AS deleted`,
      { assetId }
    )
    return result.records[0].get('deleted').toNumber() > 0
  } finally {
    await session.close()
  }
}

// Delete a specific rating relationship
async function deleteRating (fromassetId, toassetId) {
  const session = getSession()
  try {
    const result = await session.run(
      `MATCH (m1:Movie {assetId: $fromassetId})-[r:RATES]->(m2:Movie {assetId: $toassetId})
       DELETE r
       RETURN count(r) AS deleted`,
      { fromassetId, toassetId }
    )
    return result.records[0].get('deleted').toNumber() > 0
  } finally {
    await session.close()
  }
}

// Delete all ratings (relationships only)
async function deleteAllRatings () {
  const session = getSession()
  try {
    const result = await session.run(
      'MATCH ()-[r:RATES]->() DELETE r RETURN count(r) AS deleted'
    )
    return result.records[0].get('deleted').toNumber()
  } finally {
    await session.close()
  }
}

// ==================== USAGE EXAMPLE ====================

const data = require('./raw-data.json')
const axios = require('axios')

async function injest (createAssets = false) {
  try {
    // run code
    const content = data.data.listAssets.items

    if (createAssets === true) {
      for (let i = 0; i <= content?.length - 1; i++) {
        const asset = content[i]
        const assetId = asset?.id?.replaceAll('de', '')
        const genres = asset.genres?.map(g => g.name)?.join('|')?.replaceAll(',', ':')
        console.log(`Executing graph relations for ${assetId} -`)
        try {
          await createMovie(assetId, 2011, genres)
        } catch (e) {
          console.log(e)
        }
      }
    }

    for (let i = 0; i <= content.length - 1; i++) {
      const asset = content[i]
      const assetId = asset?.id?.replaceAll('de', '')
      console.log(`Executing graph relations for ${assetId} -`)
      const otherAssets = content?.map(item => item.id?.replaceAll('de', ''))?.filter(i => i !== assetId)

      const data = JSON.stringify({
        item_ids: otherAssets,
        reference_item_id: assetId
      })

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'http://localhost:8000/score_items',
        headers: {
          'Content-Type': 'application/json'
        },
        data
      }

      const response = (await axios(config))?.data

      if (!response.scores || response?.scores?.length === 0) {
        console.log(response.scores)
        throw new Error('Response empty for ' + assetId)
      }

      const keys = Object.keys(response.scores)
      for (const compareAssetId of keys) {
        if (response.scores[compareAssetId] === 0) continue

        console.log(`Creating rating between ${assetId} and ${compareAssetId} as ${response.scores[compareAssetId]}`)
        await createRating(assetId, compareAssetId, response.scores[compareAssetId])
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await driver.close()
  }
}

// Run demo (uncomment to execute)

// Export functions
module.exports = {
  injest,
  createMovie,
  createRating,
  getAllMovies,
  getMovie,
  getRatingsFrom,
  getRatingsTo,
  getRatingBetween,
  getTopRatedMovies,
  updateMovie,
  updateRating,
  deleteMovie,
  deleteRating,
  deleteAllRatings,
  driver
}
