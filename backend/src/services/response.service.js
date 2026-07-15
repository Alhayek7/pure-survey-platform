const { Response, Answer, Survey, Question, Attachment } = require('../models');
async function getResponse(id) { return Response.findByPk(id, { include: [{ model: Answer, as: 'answers', include: [{ model: Question, as: 'question' }, { model: Attachment, as: 'file' }] }, { model: Survey, as: 'survey' }] }); }
async function getSurveyResponses(surveyId) { return Response.findAll({ where: { survey_id: surveyId }, include: [{ model: Answer, as: 'answers', include: [{ model: Question, as: 'question' }] }] }); }
module.exports = { getResponse, getSurveyResponses };
