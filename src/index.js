import http from 'http';
import config from './config';
import app from './app';

// Setup API
const server = http.createServer(app);
export default server.listen(config.express.server.port);
