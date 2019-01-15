/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'faf863c84151409b85ddf0bce2ba6a57'; // Your client id
var client_secret = 'df4b6a122c7f4d5c8261e33e6c8171a3'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var playlistArray = new Array();

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        var playlist_id = playlistArray;
        var options = {
          url: 'https://api.spotify.com/v1/me/playlists',
          headers: { 'Authorization': 'Bearer ' + access_token, 'Accept-Charset': 'utf-8' },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          //  Get list of playlist names & ids
          getPlaylist(body, plCallback);
        });

        // Callback functions
        function plCallback(selected_playlist) {
          playlist_id =
          console.log(playlist_id);
        }

        function getPlaylist(body, plCallback) {
          // Pull user playlists
          for (var i = 0; i < body.items.length; i++) {
            playlistArray.push({'name': body.items[i].name, 'id': body.items[i].id});
          }

          // prompt user to select desired playlist to shuffle
          var selPlaylist = document.getElementById('playlist-drop');
          for (var i = 0; i < playlistArray.length; i++) {
            var opt = playlistArray[i].name;
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
          }

          // send selected playlist to Callback
          var dropdown_return = document.getElementById('playlist-drop');
          var selected_playlist = dropdown_return.options[dropdown_return.selectedIndex].text;
          plCallback(selected_playlist);
        }

        // Get the tracklist of the selected playlist
        /*var opts = {
          url: 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        }
        request.get(opts, function(error, response, body) {
          // DEBUG:
          console.log(body);
          // Fisher-Yates shuffle algorithm
          var tracklist = body;
          function shuffle(tracklist) {
            var currentIndex = tracklist.length, temporaryValue, randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {

              // Pick a remaining element...
              randomIndex = Math.floor(Math.random() * currentIndex);
              currentIndex -= 1;

              // And swap it with the current element.
              temporaryValue = tracklist[currentIndex];
              tracklist[currentIndex] = tracklist[randomIndex];
              tracklist[randomIndex] = temporaryValue;
            }

            return tracklist;
          }
        });*/

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
