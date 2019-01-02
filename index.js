const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");
const bodyParser = require("body-parser");
const sslRedirect = require("heroku-ssl-redirect");
const requestPromise = require("request-promise-native");
const cors = require("cors");
const cronofy = require("cronofy");

const app = express();

// demo db
var authenticatedUsers = [];

// Serve static files from the React app
//app.use(express.static(path.join(__dirname, "client/build")));
//app.use(bodyParser.json());

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
  console.log(`Sent ${count} fake passwords, and they are the fakes ${passwords}.`);
});

app.get("/show-user", async (req, res, next) => {
  res.send(authenticatedUsers);
});

app.get("/cronofy-auth", async (req, res, next) => {
  try {
    const redirect_uri = `${process.env.CRONOFY_API_URL}/nextStep`;
    const scope = "read_events";

    res.redirect(
      `https://app.cronofy.com/oauth/authorize?response_type=code&client_id=${
        process.env.CRONOFY_API_CLIENT_ID
      }&redirect_uri=${redirect_uri}&scope=${scope}`
    );
  } catch (err) {
    return console.error(err);
  }
});

app.get("/nextStep", async (req, res, next) => {
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
        redirect_uri: `${process.env.CRONOFY_API_URL}/nextStep`
      },
      headers: {
        "User-Agent": "Request-Promise",
        "Content-Type": "application/json charset=utf-8"
      },
      json: true // Automatically parses the JSON string in the response
    };
    await requestPromise(options)
      .then(answer => {
        authenticatedUsers.push(answer);
        console.log("An access code now: " + answer.access_token);
        return res.redirect(`${process.env.CRONOFY_WEB_URL}`);
      })
      .catch(e => console.error(e));
  } catch (e) {
    res.send(e);
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
console.log(`Fake password generator listening on ${port}`);
