
import Router from 'express';

import responses_route from './responses';
import recoveries_route from './recoveries';
import spots_route from './spots';
import confirm_route from './confirm';
import counts_route from './counts';

const router = Router();

router.use('/responses', responses_route);
router.use('/recoveries', recoveries_route);
router.use('/data/spots', spots_route);
router.use('/data/counts', counts_route);
router.use('/confirm', confirm_route);

export default router;
