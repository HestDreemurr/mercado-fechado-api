require("dotenv/config")
const express = require("express")
const jwt = require("jsonwebtoken")
const db = require("./db")
const mw = require("./middlewares")

const app = express()

const secret = process.env.SECRET_KEY
const admName = process.env.ADMIN_NAME
const admPassword = process.env.ADMIN_PASSWORD

app.use(express.json())

app.get("/produtos", mw.authenticateToken, async (req, res) => {
  // PLT = Price Lower Than
  // PGT = Price Greater Than
  let { search, plt, pgt } = req.query // Filters
  let query = {}
  
  if (search) {
    query.$text = { $search: search }
  }
  
  if (plt) {
    query.price = { $lte: Number(plt) } // Products where PRICE <= PLT
  }
  
  if (pgt) {
    query.price = { $gte: Number(pgt) } // Products where PRICE >= PGT
  }
  
  let products = await db.getProducts(query)
  
  return res.json(products)
})

app.post("/produto", mw.authenticateToken, async (req, res) => {
  await db.addProduct({
    ...req.body,
    seller: req.user.name
  })
  
  return res.status(201).send()
})

app.put("/produto/:id", mw.authenticateToken, mw.authenticateSeller, async (req, res) => {
  let query = {
    _id: req.params.id
  }
  
  await db.updateProduct(query, req.body)
  
  return res.status(201).send()
})

app.delete("/produto/:id", mw.authenticateToken, mw.authenticateSeller, async (req, res) => {
  let query = {
    _id: req.params.id
  }
  
  await db.deleteProduct(query)
  
  return res.status(204).send()
})

app.post("/signin", mw.authenticateAdmin, async (req, res) => {
  await db.insertUser(req.body)
  
  let token = jwt.sign(req.body, secret, { expiresIn: "1y" })
  
  return res.json({ token })
})

app.post("/login", mw.authenticateAdmin, async (req, res) => {
  let validUser = await db.authUser(req.body)
  
  if (validUser) {
    let token = jwt.sign(req.body, secret, { expiresIn: "1y" })
    return res.status(200).json({ token })
  } else {
    return res.status(401).json({ message: "Usuário inválido" })
  }
})

app.post("/admin", (req, res) => {
  let validAdmin = req.body.name === admName && req.body.password === admPassword
  
  if (validAdmin) {
    let token = jwt.sign({
      name: admName,
      password: admPassword
    }, secret, { expiresIn: "1y" })
    
    return res.json({ token })
  } else {
    return res.status(401).json({ message: "Credenciais inválidas" })
  }
})

app.listen({
  port: 3000
}, () => {
  console.log("A API está on-line!")
})