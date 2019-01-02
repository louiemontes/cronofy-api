const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");
const bodyParser = require("body-parser");
const sslRedirect = require("heroku-ssl-redirect");
const requestPromise = require("request-promise-native");

const cronofy = require("cronofy");

const app = express();

// Serve static files from the React app
//app.use(express.static(path.join(__dirname, "client/build")));
//app.use(bodyParser.json());
app.use(sslRedirect());

app.get("/passwords", (req, res) => {
  const count = 5;

  // Generate some passwords
  const passwords = Array.from(Array(count).keys()).map(i =>
    generatePassword(12, false)
  );

  // Return them as json
  res.json(passwords);

  console.log(`Sent ${count} passwords`);
});

app.get("/cronofy-auth", async (req, res, next) => {
  try {
    //return res.send(req);
    //console.log(res);
    const client_id = "H64-3XqkIV37IKKqIg6PDlbIwq_C9qSa";
    // const client_secret =
    // "sRAdSsqCqMFRa5KuAq_fmwUvLSGEbSIXCZxIsvu3RToM7PjmtQLr-32LHB1614fFcx-SlmoJ2nQmUI8f3pCYUw";
    // const response_type = "code";
    const redirect_uri = "http://localhost:8080/nextStep";
    const scope = "read_events";

    res.redirect(
      `https://app.cronofy.com/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`
    );
    /*
    requestPromise(options)
      .then(resFromToken => {
        //console.log(resFromToken);
        //return res.send(resFromToken);
        res.send(resFromToken);
      })
      .catch(err => res.send(err));

    //console.log(token);

    */
    //    return res.send();
  } catch (err) {
    return console.error(err);
  }
});

/*
app.get("/oauth/v2/authorize", async (req, res, next) => {
  console.log(req);
  res.send();
});

*/
app.get("/nextStep", async (req, res, next) => {
  try {
    req.query &&
      req.query.code &&
      console.log("Just a code so far: " + req.query.code);
    var options = {
      uri: "https://api.cronofy.com/oauth/token",
      method: "POST",
      qs: {
        client_id: "H64-3XqkIV37IKKqIg6PDlbIwq_C9qSa",
        client_secret:
          "sRAdSsqCqMFRa5KuAq_fmwUvLSGEbSIXCZxIsvu3RToM7PjmtQLr-32LHB1614fFcx-SlmoJ2nQmUI8f3pCYUw",
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: "http://localhost:8080/nextStep"
      },
      headers: {
        "User-Agent": "Request-Promise",
        "Content-Type": "application/json charset=utf-8"
      },
      json: true // Automatically parses the JSON string in the response
    };
    const ask = await requestPromise(options)
      .then(() => res.redirect("http://localhost:8080/authenticated"))
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
console.log(`Password generator listening on ${port}`);
console.log(process.env.CRONOFY_API_CLIENT_SECRET);
