var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors');
var Webtask = require('webtask-tools');
var Pusher = require('pusher');

var app = express();
var options = require('./config');
var AfricasTalking = require('africastalking')(options.AT);
var sms     = AfricasTalking.SMS;
var voice   = AfricasTalking.VOICE;

/* Set up mongoose */
mongoose.connect('mongodb://chris:password@ds151024.mlab.com:51024/at');
var Client = require('./model');

/* Set up pusher */
var pusher = new Pusher(options.pusher);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var txt_message = "Thank you for contacting AfricasTalking. ";
txt_message += "We are happy to serve you. ";
txt_message += "Service number is +2348055476231";

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
})

app.get('/ussd', function(req, res) {
  // get all the users
  Client.find({}, function(err, clients) {
    if (err) res.send(err);

    // object of all the users
    res.json(clients)
  });
})

app.post('/ussd', function(req, res) {
  console.log(req.body);
  var message = "";

  var sessionId   = req.body.sessionId;
  var serviceCode = req.body.serviceCode;
  var phoneNumber = req.body.phoneNumber;
  var text 	      = req.body.text;

  console.log(sessionId, serviceCode, phoneNumber, text);

  var length = text.split('*').length;
  var txt = text.split('*');

  if (text === '') {
	 message = 'CON Welcome to AfricasTalking\n';
	 message += 'Enter your name to place an order. \n';
  }

  // add a client
  else if (length === 1) {
    // check if user is agent
    message = 'END You have been registered, you will receive a confirmation message shortly';
    var opts = { 'to': phoneNumber, 'message': txt_message };

    sms.send(opts)
    .then(function(s) {
      console.log(s);
    })
    .catch(function (error) {
      console.log(error);
    });

    var options = text.split('*');
    console.log('Array from ussd', options);

      //Store the Client
      var client = new Client();
        client.name= options[options.length-1];
        client.phoneNumber= phoneNumber;
      //save the client
      client.save().then(function(client){
        pusher.trigger('AT', 'request', client);
        res.json({ message: 'client is stored'});
      })
      .catch(function(error){
        console.log({ message: 'error creating client...', error});
      });     

  }
  else {
	  message = 'END Wrong input';
  }

  res.contentType('text/plain');
  res.send(message, 200);
});

app.listen('4300', function() {
  console.log('Listening...')
})
// module.exports = Webtask.fromExpress(app);