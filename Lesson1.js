const http = require('http');

const server = http.createServer((req, res) => {
   res.writeHead(200, 
    {'Content-Type': 'type/plain'}
   )

   res.end('Hello, World! ')
})

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})