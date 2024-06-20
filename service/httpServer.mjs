import { createServer } from 'node:http'
import fs from 'node:fs'

const port = process.argv[2]
const processId = process.argv[3]

const httpServer = createServer()

if (processId) {
  setInterval(() => {
    try {
      process.kill(Number(processId), 0)
    } catch (ex) {
      try {
        process.kill(process.pid, 'SIGKILL')
      } catch (e) {}
    }
  }, 10000)
}

process.on('uncaughtException', () => {})
httpServer.on('request', (request, response) => {
  if (request.url?.includes('/static/')) {
    let path = ''
    try {
      const filePath = request.url
      const startPos = filePath.indexOf('path=') + 5
      const tmpPath = filePath.substring(startPos)
      path = decodeURIComponent(tmpPath)
    } catch (error) {}
    if (fs.existsSync(path)) {
      response.writeHead(200, {})
      fs.createReadStream(path).pipe(response)
    } else {
      response.write('404')
      response.end()
    }
  } else if (request.url === '/favicon.ico') {
    response.end()
  } else {
    response.write('404')
    response.end()
  }
})

httpServer.listen(port, () => {
  console.log(`HTTP服务器正在监听 ${port}`)
})
