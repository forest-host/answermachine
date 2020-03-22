import Router from 'express';

const router = Router();

//router.use('/treatments', treatment);

router.get('/', (req, res) => {
  res.json({ 'say': 'hi' });
});

export default router;
