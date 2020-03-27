import Router from 'express';
const router = Router();

import load_respondent from '../middleware/load_respondent';
import models from '../models';
import { knex } from '../bookshelf';

import config from 'config';
import email_subjects from '../../emails/update/subjects.json';
import fs from 'fs';
import dot from 'dot';
import nodemailer from 'nodemailer';

const process_confirmation = async function(req, res, next) {
  if(typeof(req.body.email) == 'undefined') {
    res.status(400);
    return res.json({});
  }

  // if respondent has already confirmed (to prevent abusing this link to sent people spam)
  if(req.respondent.get('email_confirmed') == true) {
    res.status(200);
    return res.json({'al': 'ding'});
  }

  req.respondent.set('email_confirmed', true);
  await req.respondent.save();

  next();
};

const send_mail = async function(req, res, next) {
  if(typeof email_subjects[req.body.locale] == 'undefined') {
    // No locale email subject, and thus template, found
    res.status(400);
    return res.json({});
  }

  let template = dot.template(fs.readFileSync(__dirname + '/../../emails/update/' + req.body.locale + '.dot').toString());
  let link = config.email.magiclink + req.respondent.get('uuid');

  try {
    let transporter = nodemailer.createTransport({ sendmail: true });

    await transporter.sendMail({
      from: config.email.from,
      to: req.body.email,
      replyTo: config.email.reply_to,
      subject: email_subjects[req.body.locale],
      html: template({ ...config.email, link })
    });
  } catch(err) {
    console.error(err);
  }

  res.json({});
};

/**
 * @api {post} /v1/confirm/:respondent_uuid confirm respondents emailaddress
 *
 * @apiDescription Confirm respondents emailaddress
 *
 * @apiParam {String} Locale
 *
 * @apiSuccess
 */
let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.post(`/:respondent_uuid(${uuid_regex})`, load_respondent, process_confirmation, send_mail);

export default router;
