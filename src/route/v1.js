
import Router from 'express';
import * as questions from '@symptotrack/questions';

const router = Router();

//router.use('/treatments', treatment);

router.get('/', (req, res) => {
  res.json(questions);
});

export default router;
