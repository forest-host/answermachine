import http from 'http';
import { express as config } from 'config';
import app from './app';

// Setup API
const server = http.createServer(app);
export default server.listen(config.server.port);
