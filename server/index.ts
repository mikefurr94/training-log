import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.use('/auth', authRouter)

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
