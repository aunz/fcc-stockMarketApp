import { createReadStream } from 'fs'
import sendFile from 'send'

require('dotenv').config()

const app = require('fastify')({})

app.get('*', function (req, rep) {
  console.log('**')
  rep.send('*')
})

app.register(require('fastify-static'), { root: require('path').resolve('./dist/public'), schemaHide: false })
// app.use(require('fastify-static')({ root: require('path').resolve('./dist/public') }))
// app.register(require('fastify-static'), { root: require('path').resolve('./dist/public') })
// fastify.register(require('fastify-auto-push').staticServe, { root: require('path').resolve('./dist/public') })
// app.get('*', (req, rep) => {
//   console.log(2, app.basepath)
//   rep.send('222')
// })


// app.register(function (instance, option, next) {
//   instance.get('*', function (req, rep, _next) {
//     console.log('middle 2 register')
//     _next()
//   })
//   next()
// })
// app.register(function (instance, option, next) {
//   instance.get('/1*', (req, rep) => {
//     console.log(1)
//     rep.send('1')
//   })
//   next()
// }, { k: 4 })


// // app.use('/2/3', function (req, rep, next) {
// //   console.log('middle2')
// //   // console.log(rep)
// //   rep.end('1221')
// // })
// app.use(function (req, rep, next) {
//   console.log('middle1')
//   next()
// })


// app.get('/3', (req, rep) => {
//   console.log(3)
//   rep.send('3')
// })

// app.get('/stream', (req, res) => {
//   console.log('stream')
//   res.header('Content-Type', 'text/event-stream')
//   res.send('data: ' + Math.random() + '\n\n')
// })

// app.get('/', function (request, reply) {
//   reply.send({ hello: '1' })
// })

// app.get('/', (req, res) => {
  // if (req.headers.accept && /text\/html/.test(req.headers.accept)) 
    // sendFile(req, './dist/public/index.html').pipe(res)
  // else next()
// })

// Run the server!
app.listen(process.env.PORT || 3000, process.env.HOST, function (err) {
  if (err) throw err
  console.log(`************************************************************
App listening at http://${app.server.address().address}:${app.server.address().port}
NODE_ENV: ${process.env.NODE_ENV}
process.pid: ${process.pid}
root: ${require('path').resolve()}
************************************************************`)
  console.log(app.printRoutes())
})

// app.get('*', function (req, rep) {
//   console.log('**')
//   rep.send('all')
// })
