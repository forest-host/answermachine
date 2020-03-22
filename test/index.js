import config from 'config';
import http from 'http';
import chai from 'chai';
import chaiHttp from 'chai-http';

import server from '../lib';

let models = [
];


let routes = [
  './route/index'
];

/**
 * Run tests helper function
 * Iterates over given array of test files and executes
 * @param array test files
 * @param mixed Arguments are passed on to tester
 */
let run_tests = (tests, ...args) => {
  tests.forEach(path => {
    try {
      let tester = require(path).default;
      tester(...args);
    }
    catch (e) {
      throw e;
    }
  });
};

/**
 * Test all the models
 */
/*
describe('Models', () => {
  run_tests(models);
});
*/

/**
 * Test all routes (and app in the process)
 */
chai.should();
chai.use(chaiHttp);

describe('Routes', () => {
  run_tests(routes, server, chai);
});

