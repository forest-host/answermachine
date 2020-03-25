import Router from 'express';
import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
import * as symptotrack from '@symptotrack/questions';
const router = Router();

import { HTTPError } from '../errors';

const questionaire = symptotrack.get_questionaire('basic');
const questions = symptotrack.get_questions(questionaire);

const aggregations = Object.keys(questions)
  .filter(question_name => questions[question_name].hasOwnProperty('filter'))
  .reduce((agg, question_name) => {
    return { ...agg, [question_name]: { filter: { term: { [question_name]: true } } } };
  }, {});

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
    if(!req.query[param]) {
      return { ...errors, [param]: 'required' };
    }

    let conditions = expected_params[param];

    if(req.query[param] < conditions.min || req.query[param] > conditions.max) {
      return { ...errors, [param]: 'out of bounds' };
    }

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
          "last_month": {
            "filter": {
              "range": {
                "created_at": {
                  "gte": "now-30d/d",
                  "lte": "now/d"
                }
              }
            },
            "aggs": {
              "grid": {
                "geotile_grid": {
                  "field": "location",
                  "precision": req.query.z,
                  "bounds": {
                    "top_left": {
                      "lat": req.query.top,
                      "lon": req.query.left
                    },
                    "bottom_right": {
                      "lat": req.query.bottom,
                      "lon": req.query.right
                    }
                  }
                },
                "aggs": aggregations,
              }
            }
          }
        }
      }
    }).then( res => res.body.aggregations.last_month);

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
    let doc_counts = Object.keys(aggregations).reduce((agg, key) => {
      return { ...agg, [key]: bucket[key].doc_count };
    }, {})

    return {
      key: bucket.key,
      hits: bucket.doc_count,
      ...doc_counts,
    };
  });

  res.json({
    hits: tiles.reduce((t, i) => { return t+i.hits; }, 0),
    tiles: tiles
  });
}

router.get('/', validate_query, query_elastic, process_response);

export default router;
