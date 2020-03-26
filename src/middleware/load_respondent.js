
import { HTTPError } from '../errors';
import models from '../models';

/**
 * Load respondent when requesting previous submissions
 */
export default async function(req, res, next) {
  try {
    // Add respondent to request
    req.respondent = await models.Respondent
      .where({ uuid: req.params.respondent_uuid })
      .fetch({ 
        withRelated: ['recoveries'],
        require: true,
      })
    next();
  } catch(err) {
    next(new HTTPError(404));
  }
}

