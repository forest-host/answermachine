import Router from 'express';
import config from '../config';
import { Client } from '@elastic/elasticsearch';
import { HTTPError } from '../errors';
const router = Router();

import models from '../models';
import { knex } from '../bookshelf';

import * as symptotrack from '@symptotrack/questions';
const questionaire = symptotrack.get_questionaire('basic');
const questions = symptotrack.get_questions(questionaire);

let aggregations = Object.keys(questions)
  .filter(question_name => questions[question_name].hasOwnProperty('filter'))
  .reduce((agg, question_name) => {
    return { ...agg, [question_name]: { filter: { term: { [question_name]: true } } } };
  }, {});

/**
 * Validate query parameters
 */
const validate_query = async function(req, res, next) {
  const expected_params = {
    'z': { min: 0, max: 13 },
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
    const elastic = new Client({ node: config.elastic.node });

    // @TODO this query can be improved to support better insights over time. For that we need to save seperate records over time instead of updating existing records
    aggregations.recovered = { filter: { exists: { field: 'recovered_at' } } };

    req.results = await elastic.search({
      index: config.elastic.index,
      size: 0,
      body: {
        aggs: {
          grid: {
            geotile_grid: {
              field: 'location',
              precision: req.query.z
            },
            aggs: {
              ...aggregations,
              spot: { geo_centroid: { field: 'location' } }
            }
          }
        },
        query: {
          bool: {
            must: [
              {
                match_all: {}
              }
            ],
            filter: [
              {
                range: {
                  updated_at: {
                    gte: 'now-30d/d',
                    lte: 'now/d'
                  }
                }
              },
              {
                geo_bounding_box: {
                  location: {
                    top_left: {
                      lat: req.query.top,
                      lon: req.query.left
                    },
                    bottom_right: {
                      lat: req.query.bottom,
                      lon: req.query.right
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }).then( res => res.body );

  } catch(err) {
    console.error(err.body);
    return next(new HTTPError(400));
  }

  next();
};

/**
 * Make it happen
 */
const process_response = function(req, res, next) {
  let spots = req.results.aggregations.grid.buckets.map( bucket => {
    let doc_counts = Object.keys(aggregations).reduce((agg, key) => {
      return { ...agg, [key]: bucket[key].doc_count };
    }, {})

    return {
      key: bucket.key,
      location: bucket.spot.location,
      hits: bucket.doc_count,
      ...doc_counts,
    };
  });

  res.json({
    hits: req.results.hits.total.value,
    spots: spots
  });
}

/**
 * @api {get} /v1/data/spots/:respondent_uuid retreive clusters of aggregated responses
 *
 * @apiDescription Get clusters of responses, like hot spots
 *
 * @apiParam {Number} Z Zoom/precision
 * @apiParam {Number} Top
 * @apiParam {Number} Left
 * @apiParam {Number} Bottom
 * @apiParam {Number} Right
 *
 * @apiSuccess
 */
router.get('/spots', validate_query, query_elastic, process_response);

/**
 * @api {get} /v1/data/counts number of respondents
 *
 * @apiSuccess
 */
const process_count = async function(req, res, next) {
  try {
    let count = await knex('respondents').count('id as count');
    res.json(count[0]);
  } catch(err) {
    console.error(err);
    return new HTTPError(400);
  }
};


router.get('/counts', process_count);

export default router;
