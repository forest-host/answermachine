
import Router from 'express';
const router = Router();

const validate_response = function(req, res, next) {
  next();
}

const process_response = function(req, res, next) {
  res.json({ hi: 'there' })
}

router.post('/', validate_response, process_response);

export default router;
