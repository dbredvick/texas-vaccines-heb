const fetch = require('node-fetch');
const dotenv = require('dotenv');
const {IncomingWebhook} = require('@slack/webhook');
const renderSlackMessage = require('../utils/renderSlackMessage');
const capitalizeSentance = require('../utils/capitalizeSentance');
const hebURL = 'https://heb-ecom-covid-vaccine.hebdigital-prd.com/vaccine_locations.json';
const scheduleURL = 'https://vaccine.heb.com/scheduler';

dotenv.config();

const webhookURL = process.env.HEB_WEBHOOK_URL;
const webhook = new IncomingWebhook(webhookURL);

let lastRunSlotCount = [];

const checkHeb = async () => {
  try {
    console.log('Checking HEB for vaccines...');
    const response = await fetch(hebURL);
    const vaccineLocations = await response.json();

    if (lastRunSlotCount.length === 0) {
      lastRunSlotCount = vaccineLocations['locations'];
    }

    const locationsWithVaccine = {};

    for (location in vaccineLocations.locations) {
      if (vaccineLocations.locations.hasOwnProperty(location)) {
        const {name, openTimeslots, city, street, url} = vaccineLocations.locations[location];

        if (openTimeslots > 3) {
          locationsWithVaccine[name] = {name, openTimeslots, city, url, street};
        }
      }
    }

    if (Object.keys(locationsWithVaccine).length === 0) {
      return;
    }

    const slackFields = [];

    for (location in locationsWithVaccine) {
      if (locationsWithVaccine.hasOwnProperty(location)) {
        const {openTimeslots, city, url, street, name} = locationsWithVaccine[location];
        const capatilizedCity = capitalizeSentance(city);
        const urlFriendlyAddress = `${street.split(' ').join('+')}+${city.split(' ').join('+')}`;
        const lastFound = lastRunSlotCount.find((locale) => locale.name === name);

        if (openTimeslots > (lastFound.openTimeslots + 3)) {
          slackFields.push({
            type: 'mrkdwn',
            text: `<${url || hebURL}|${location}>:  *${openTimeslots}* \n<https://google.com/maps/?q=${urlFriendlyAddress}|${capatilizedCity}>`,
          });
        }
      }
    }

    if (slackFields.length > 10) {
      slackFields.length = 10; // Slack limits the number of fields to 10
    }

    if (slackFields.length > 0) {
      const slackMessage = renderSlackMessage(scheduleURL, slackFields);
      await webhook.send(slackMessage);
    }

    lastRunSlotCount = vaccineLocations['locations'];
  } catch (e) {
    console.error(e);
  }
};

module.exports = checkHeb;
