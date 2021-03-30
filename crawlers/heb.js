require('dotenv').config();
const fetch = require('node-fetch');
const renderSlackMessage = require('../utils/renderSlackMessage');
const capitalizeSentance = require('../utils/capitalizeSentance');
const hebURL = 'https://heb-ecom-covid-vaccine.hebdigital-prd.com/vaccine_locations.json';
const scheduleURL = 'https://vaccine.heb.com/scheduler';
const open = require('open');

let lastRunSlotCount = [];
const openedUrls = [];

const clearUrls = () => {
  console.log('clearing opened urls');
  while (openedUrls.length) {
    openedUrls.pop();
  }
};

const distance = (lat1, lon1, lat2, lon2, unit) => {
  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  } else {
    const radlat1 = (Math.PI * lat1) / 180;
    const radlat2 = (Math.PI * lat2) / 180;
    const theta = lon1 - lon2;
    const radtheta = (Math.PI * theta) / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
      dist = dist * 1.609344;
    }
    if (unit == 'N') {
      dist = dist * 0.8684;
    }
    return dist;
  }
};


const excludedCities = [
  'odessa',
  'midland',
  'mcallen',
  'harlingen',
  'falfurrias',
  'mission',
  'san angelo',
  'mont belvieu',
  'port arthur',
];

const slotThreshold = 1;

const extractSlotDetails = (slotDetails) => slotDetails.map((deets) => deets.manufacturer).join(', ');

const checkHeb = async () => {
  try {
    const response = await fetch(hebURL);
    const vaccineLocations = await response.json();

    if (lastRunSlotCount.length === 0) {
      lastRunSlotCount = vaccineLocations['locations'];
    }

    const locationsWithVaccine = {};

    for (location in vaccineLocations.locations) {
      if (vaccineLocations.locations.hasOwnProperty(location)) {
        const {name, openTimeslots, openAppointmentSlots, city, street, url, slotDetails, latitude, longitude} = vaccineLocations.locations[location];
        const manufacturers = extractSlotDetails(slotDetails);


        if (openAppointmentSlots >= slotThreshold && !excludedCities.includes(city.toLowerCase())) {
          locationsWithVaccine[name] = {name, openTimeslots, openAppointmentSlots, city, url, street, manufacturers, latitude, longitude};
        }
      }
    }

    if (Object.keys(locationsWithVaccine).length === 0) {
      return;
    }

    let slackFields = [];

    for (location in locationsWithVaccine) {
      if (locationsWithVaccine.hasOwnProperty(location)) {
        const {city, url, latitude, longitude} = locationsWithVaccine[location];
        console.log('city with vax', locationsWithVaccine[location].city);
        if ( distance(parseFloat(latitude), parseFloat(longitude), 30.1492806, -97.7154811, 'N') <= 45 ) {
          console.log('found one!');
          slackFields.push(url || hebURL);
        }
      }
    }
    const unique = new Set(slackFields);

    [...unique].map((link) => {
      if (!openedUrls.includes(link)) {
        open(link);
        console.log('opening your tab');
        slackFields = [];
        openedUrls.push(link);
      }
    });

    slackFields = [];

    lastRunSlotCount = vaccineLocations['locations'];
  } catch (e) {
    console.error(e);
  }
};

module.exports = {checkHeb, clearUrls};
