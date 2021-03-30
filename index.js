require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const {setIntervalAsync} = require('set-interval-async/dynamic');
const checkHeb = require('./crawlers/heb');


const cronJobInterval = '0/1 * * * * *';

app = express();

const keepaliveURL = process.env.KEEP_ALIVE_URL;

app.get('/alive', function(req, res) {
  res.send('Staying alive.');
});

cron.schedule(cronJobInterval, async () => {
  try {
    const keep = await fetch(keepaliveURL);
    console.log('running');
    checkHeb.clearUrls();

    // await checkBellCounty();
    // await checkAlamodome();
    // await checkUniversity();
    // await checkWalmart();
    // await checkWalgreens();
    // await checkFallsHospital();
  } catch (error) {
    console.error(error);
  }
});

try {
  setIntervalAsync(
      async () => {
        await checkHeb.checkHeb();
      },
      1000 * 1,
  );
} catch (e) {
  console.error(e);
}

app.listen(process.env.PORT);
