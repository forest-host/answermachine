
import Router from 'express';

import responses_route from './responses';
import recoveries_route from './recoveries';
import confirm_route from './confirm';
import data_route from './data';

const router = Router();

router.use('/responses', responses_route);
router.use('/recoveries', recoveries_route);
router.use('/data', data_route);
router.use('/confirm', confirm_route);

export default router;
