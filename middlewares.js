require("dotenv/config")
const jwt = require("jsonwebtoken")
const db = require("./db")

const secret = process.env.SECRET_KEY
const admName = process.env.ADMIN_NAME
const admPassword = process.env.ADMIN_PASSWORD

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1] // JWT Token passed in Headers
  if (!token) return res.status(401).send({ message: "Token ausente" })
  
  // Verify if the token is valid
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(401).send({ message: "Token inválido" })
    req.user = user
    next()
  })
}

async function authenticateSeller(req, res, next) {
  let product = await db.getProducts({  _id: req.params.id })
  if (product[0].seller === req.user.name) {
    next()
  } else {
    return res.status(401).json({ message: "Apenas o dono do produto pode alterar/deletar" })
  }
}

function authenticateAdmin(req, res, next) {
   const adminToken = req.headers["authorization"]?.split(" ")[1]
   if (!adminToken) return res.status(401).json({ message: "Token ausente" })
   
   jwt.verify(adminToken, secret, (err, admin) => {
     if (err) return res.status(401).json({ message: "Token inválido" })
     let validAdmin = admin.name === admName && admin.password === admPassword
     if (!validAdmin) return res.status(401).json({  message: "Credenciais do ADM inválidas" })
     req.user = admin
     next()
   })
}

module.exports = {
  authenticateToken,
  authenticateSeller,
  authenticateAdmin
}