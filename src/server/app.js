import express from 'express'
import helmet from 'helmet'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', true)

if (process.env.NODE_ENV === 'production') app.use(helmet())

app.use(express.static('./dist/public'))


{
  let id = Date.now() + ''
  const symbols = []

  app.get('/stream', function (req, res) {
    const lastId = req.headers['last-event-id']
    res.set('Content-Type', 'text/event-stream')
    if (lastId === id) {
      res.end()
      return
    }

    res.send(`
id: ${id}
data: ${symbols}

`)
  })

  app.all('/stream/:symbol', function (req, res) {
    const isPost = req.method === 'POST'
    const isDelete = req.method === 'DELETE'
    if (isPost || isDelete) {
      let { symbol = '' } = req.params
      symbol = symbol.replace(/[^a-zA-Z_]/g, '').toUpperCase()

      if (symbol) {
        const index = symbols.indexOf(symbol)
        if (isPost) {
          if (index === -1) {
            symbols.push(symbol)
            id = Date.now() + ''
          }
        } else {
          if (index > -1) { // eslint-disable-line no-lonely-if
            symbols.splice(index, 1)
            id = Date.now() + ''
          }
        }
      }
    }
    res.end()
  })
}

if (process.env.NODE_ENV === 'development') {
  app.get('/testData/:symbol', function (req, res) {
    const { symbol } = req.params

    const data = require('~/tmp/testData/' + symbol + '.json')
    if (symbol === 'ERROR') res.status(404)
    res.send(data)
  })
}

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    res.sendFile('index.html', { root: './dist/public' }, e => e && next())
  } else next()
})

app.listen(process.env.PORT || 3000, process.env.HOST, function () {
  console.log(`************************************************************
Express app listening at http://${this.address().address}:${this.address().port}
NODE_ENV: ${process.env.NODE_ENV}
process.pid: ${process.pid}
root: ${require('path').resolve()}
************************************************************`)
})

export default app
