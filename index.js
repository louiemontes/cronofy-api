const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");
const bodyParser = require("body-parser");
const sslRedirect = require("heroku-ssl-redirect");
const requestPromise = require("request-promise-native");
const cors = require("cors");
const Cronofy = require("cronofy");
const Moment = require("moment");

const app = express();

// demo db
var authenticatedUsers = [];

// Serve static files from the React app
//app.use(express.static(path.join(__dirname, "client/build")));
//app.use(bodyParser.json());
app.use(express.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(sslRedirect());

app.get("/passwords", (req, res) => {
  const count = 5;

  // Generate some passwords
  const passwords = Array.from(Array(count).keys()).map(i =>
    generatePassword(12, false)
  );

  res.send(passwords);
  console.log(
    `Sent ${count} fake passwords, and they are the fakes ${passwords}.`
  );
});

function userHasAuthorized(someAuthenticatedUsers, someUserId) {
  let hasUserAuthed = false;
  if (!someAuthenticatedUsers.length) {
    return hasUserAuthed;
  } else {
    someAuthenticatedUsers.forEach(accessBlock => {
      if (accessBlock.userId === someUserId) {
        hasUserAuthed = true;
      }
    });
    return hasUserAuthed;
  }
}

function makeId() {
  return Math.floor(Math.random() * 1000000000);
}

app.get("/show-user/:userId", async (req, res, next) => {
  if (
    req.params &&
    req.params.userId &&
    userHasAuthorized(authenticatedUsers, req.params.userId)
  ) {
    res.send(authenticatedUsers);
  } else {
    res.send("Get out of here!");
  }
});

app.get("/cronofy-auth/:userId", async (req, res, next) => {
  try {
    const redirect_uri = `${process.env.CRONOFY_API_URL}/nextStep/${
      req.params.userId
    }`;
    const scope = "read_events create_event delete_event";

    res.redirect(
      `https://app.cronofy.com/oauth/authorize?response_type=code&client_id=${
        process.env.CRONOFY_API_CLIENT_ID
      }&redirect_uri=${redirect_uri}&scope=${scope}`
    );
  } catch (err) {
    return console.error(err);
  }
});

app.get("/nextStep/:userId", async (req, res, next) => {
  try {
    req.query &&
      req.query.code &&
      console.log("Just a code so far: " + req.query.code);

    var options = {
      uri: "https://api.cronofy.com/oauth/token",
      method: "POST",
      qs: {
        client_id: process.env.CRONOFY_API_CLIENT_ID,
        client_secret: process.env.CRONOFY_API_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: `${process.env.CRONOFY_API_URL}/nextStep/${
          req.params.userId
        }`
      },
      headers: {
        "User-Agent": "Request-Promise",
        "Content-Type": "application/json charset=utf-8"
      },
      json: true // Automatically parses the JSON string in the response
    };
    await requestPromise(options)
      .then(answer => {
        const { userId } = req.params;
        authenticatedUsers.push({ userId, ...answer });
        console.log("An access code now: " + answer.access_token);
        return res.redirect(`${process.env.CRONOFY_WEB_URL}`);
      })
      .catch(e => console.error(e));
  } catch (e) {
    res.send(e);
  }
});

/*
app.get("/readCalenders/:accessToken", async (req, res, next) => {
  try {
    console.log("in read calanders");
    var options = {
      uri: `https://api.cronofy.com/v1/calendars`,
      method: "GET",
      headers: {
        "User-Agent": "Request-Promise",
        "Content-Type": "application/json charset=utf-8",
        Authorization: `Bearer ${req.params.accessToken}`
      },

      body: {},
      json: true // Automatically parses the JSON string in the response
    };
    await requestPromise(options)
      .then(answer => {
        console.log(answer);
        res.send(answer.calendars[0].calendar_id);
      })
      .catch(e => console.log(e));
  } catch (error) {
    res.send(e);
  }
});
*/

app.post("/createEvent/:userId", async (req, res, next) => {
  try {
    console.log(req.params);
    console.log(req.body);
    const { access_token } = req.body;

    console.log({ access_token });
    var cronofyClient = new Cronofy({
      access_token
    });

    let calendarId;
    await cronofyClient
      .listCalendars()
      .then(answer => {
        console.log(answer);
        calendarId = answer.calendars[0].calendar_id;
        return calendarId;
      })
      .catch(errorFromList => {
        throw errorFromList;
      });

    console.log(calendarId);
    let rawStart = new Date(req.body.start);
    const cleanStart = rawStart.toISOString();
    let rawEnd = new Date(req.body.end);
    const cleanEnd = rawEnd.toISOString();

    var options = {
      calendar_id: calendarId,
      event_id: "luisEvent",
      summary: "Board meeting",
      description: "Made from demo",
      start: cleanStart,
      end: cleanEnd,
      location: {
        description: "Board room"
      }
    };

    await cronofyClient
      .createEvent(options)
      .then(function() {
        // Success
        console.log("created event");
      })
      .catch(e => console.log(e));
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.post("/deleteEvent/:userId", async (req, res, next) => {
  try {
    const { access_token } = req.body;

    console.log({ access_token });
    var cronofyClient = new Cronofy({
      access_token
    });

    let calendarId;
    await cronofyClient
      .listCalendars()
      .then(answer => {
        console.log(answer);
        calendarId = answer.calendars[0].calendar_id;
        return calendarId;
      })
      .catch(errorFromList => {
        throw errorFromList;
      });

    console.log(calendarId);

    var options = {
      calendar_id: calendarId,
      event_id: "luisEvent"
    };

    await cronofyClient
      .deleteEvent(options)
      .then(function() {
        // Success
        console.log("deleted event");
      })
      .catch(e => console.log(e));
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("/authenticated", (req, res) => {
  res.sendFile(path.join(__dirname + "/auth.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

const port = process.env.PORT || 8080;

app.listen(port);
console.log(`Cronofy demo listening on ${port}`);
