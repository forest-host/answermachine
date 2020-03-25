import Router from 'express';
import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
const router = Router();

import { HTTPError } from '../errors';


/**
 * Validate query parameters
 */
const validate_query = async function(req, res, next) {
  const expected_params = {
    'z': { min: 5, max: 9 },
    'top': { min: -90, max: 90 },
    'bottom': { min: -90, max: 90 },
    'left': { min: -180, max: 180 },
    'right': { min: -180, max: 180 }
  };

  let errors = Object.keys(expected_params).reduce((errors, param) => {
    // is empty?
    if(!req.query[param])
      return { ...errors, [param]: 'required' };

    let conditions = expected_params[param];

    if(req.query[param] < conditions.min || req.query[param] > conditions.max)
      return { ...errors, [param]: 'out of bounds' };

    return errors;
  }, {});


  if(Object.keys(errors).length > 0) {
    res.status(400);
    return res.json({ errors: errors });
  }

  next();
};

/**
 * Query Elastic
 */
const query_elastic = async function(req, res, next) {
  try {
    const elastic = new Client({ node: config.node });

    req.tiles = await elastic.search({
      index: config.index,
      size: 0,
      body: {
        "aggs": {
          "area": {
            "filter": {
              "geo_bounding_box": {
                "location": {
                  "top_left": {
                    "lat": req.query.top,
                    "lon": req.query.left
                  },
                  "bottom_right": {
                    "lat": req.query.bottom,
                    "lon": req.query.right
                  }
                }
              }
            },
            "aggs": {
              "grid": {
                "geotile_grid": {
                  "field": "location",
                  "precision": req.query.z
                },
                "aggs": {
                  "fever": {
                    "filter": {
                      "term": {
                        "fever": true
                      }
                    }
                  },
                  "dry_cough": {
                    "filter": {
                      "term": {
                        "dry_cough": true
                      }
                    }
                  },
                  "tired": {
                    "filter": {
                      "term": {
                        "tired": true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }).then( res => res.body.aggregations.area );

  } catch(e) {
    return next(new HTTPError(400));
  }

  next();
};

/**
 * Make it happen
 */
const process_response = function(req, res, next) {
  let tiles = req.tiles.grid.buckets.map( bucket => {
    return {
      key: bucket.key,
      hits: bucket.doc_count,
      dry_cough: bucket.dry_cough.doc_count,
      tired: bucket.tired.doc_count,
      fever: bucket.fever.doc_count
    };
  });

  res.json({
    hits: req.tiles.doc_count,
    tiles: tiles
  });
}

router.get('/', validate_query, query_elastic, process_response);

export default router;
