import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import { origin } from 'config';

// import routes
import v1 from './route/v1';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: origin }));

// Setup a logger when we are not testing to keep track of http traffic
if(process.env.NODE_ENV != 'testing') {
  var access_log = morgan('combined');
  app.use(access_log);
}

// Setup routes
app.use('/v1', v1);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send(err.message);
});

export default app;
