require("dotenv/config")
const { MongoClient } = require("mongodb")
const { randomUUID, randomBytes, pbkdf2Sync } = require("node:crypto")

const token = process.env.MONGODB_TOKEN

let productsColl;
let usersColl;

connect()

async function connect() {
  const client = new MongoClient(token)
  const database = await client.db("mercado-fechado")
  productsColl = await database.collection("produtos")
  usersColl = await database.collection("usuarios")
}

async function getProducts(query) {
  let products = await productsColl.find(query).toArray()
  return products
}

async function addProduct(product) {
  await productsColl.insertOne({
    _id: randomUUID(),
    ...product
  })
}

async function updateProduct(query, newProduct) {
  await productsColl.updateOne(query, {
    $set: newProduct
  })
}

async function deleteProduct(query) {
  await productsColl.deleteOne(query)
}

async function insertUser(user) {
  let password = hashPassword(user.password)
  await usersColl.insertOne({
    ...user,
    ...password
  })
}

async function authUser(user) {
  let dbUser = await usersColl.findOne({ name: user.name })
  return isValidPassword(user.password, dbUser.salt, dbUser.password)
}


function hashPassword(password) {
  let salt = randomBytes(32).toString('hex')
  let hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return { salt, password: hash }
}

function isValidPassword(password, salt, hash) {
  let userHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === userHash
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  insertUser,
  authUser
}