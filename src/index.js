require("dotenv/config")
const express = require("express")
const jwt = require("jsonwebtoken")
const z = require("zod")
const { ObjectId } = require("mongodb")

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
  
  function validateFilter(filter) {
    let filterSchema = z.coerce.number()
    let result = filterSchema.safeParse(filter)
    
    if (!result.success) return res.status(400).json({ message: "Insira filtros válidos" })
    
    return result.data
  }
  
  let and = []
  
  if (search) {
    and.push({
      $text: { $search: search }
    })
  }
  
  if (plt) {
    let data = validateFilter(plt)
    and.push({
      price: { $lte: data } // Products where PRICE <= PLT
    })
  }
  
  if (pgt) {
    let data = validateFilter(pgt)
    and.push({
      price: { $gte: data } // Products where PRICE >= PGT
    })
  }
  
  let query = and ? { $and: and } : {}
  
  let products = await db.getProducts(query)
  
  return res.json(products)
})

app.post("/produto", mw.authenticateToken, async (req, res) => {
  let productSchema = z.object({
    name: z.string(),
    description: z.string(),
    price: z.number()
  })
  let result = productSchema.safeParse(req.body)
  
  if (!result.success) return res.status(400).json({ message: "Produto inválido" })
  
  await db.addProduct({
    ...result.data,
    seller: req.user.name
  })
  
  return res.status(201).send()
})

app.put("/produto/:id", mw.authenticateToken, mw.authenticateSeller, async (req, res) => {
  let query = {
    _id: ObjectId(req.params.id)
  }
  
  let productSchema = z.object({
    name: z.string(),
    description: z.string(),
    price: z.number()
  }).partial()
  let result = productSchema.safeParse(req.body)
  
  if (!result.success) return res.status(400).json({ message: "Atualizações inválidas" })
  
  await db.updateProduct(query, result.data)
  
  return res.status(201).send()
})

app.delete("/produto/:id", mw.authenticateToken, mw.authenticateSeller, async (req, res) => {
  let query = {
    _id: ObjectId(req.params.id)
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