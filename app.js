//*****************************************************************************
//     Application: Email Application
//     Author:      Joshua McClure(jmcclu23)
//     Date:        2017-04-23
//     File:        app.js
//     Description: main routing file for Email Application
//*****************************************************************************
//     History
//*****************************************************************************
// Date         Version     User       Description
//2017-04-23      1.0     jmcclu23     Initial Commit, new program
//*****************************************************************************
//setup
//*****************************************************************************
//setup express
var express      = require('express');
//setup app
var app          = express();
//setup databse
var mongoose     = require('mongoose');
//setup user authentication
var passport     = require('passport');
//setup flash error message
var flash        = require('connect-flash');
//setup app path variable
var path         = require('path');
//setup bodyparser to pull elements from ejs
var bodyParser   = require('body-parser');
//setup session token
var session      = require('express-session');
//setup dev logging
var morgan       = require('morgan');
//setup parser to pull elements from cookies
var cookieParser = require('cookie-parser');
//setup app to run on port
var port         = process.env.PORT||1337;
//setup app to find DB connection
var configDB     = require('./config/database');
//setup app to use file commands
var fs           = require('fs');
//setup app to encrypt/decrypt functions
var openpgp      = require('openpgp');
var async = require("async");
//Setup app to read passport configuration
require('./config/passport')(passport);
//******************************************************************************
//configure app
//*****************************************************************************
//Sets up program to parse ejs
app.set('view engine', 'ejs');
//Sets up path for program to read views folder
app.set('views', path.join(__dirname, 'views'));
 //Sets up connection for Mongo Database
mongoose.connect(configDB.url);
//*****************************************************************************
//use middleware
//*****************************************************************************
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'bower_components/')));
app.use(session({secret: 'learningjavascriptforgradschool'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
openpgp.initWorker({ path:'openpgp.worker.js' })
openpgp.config.aead_protect = true
//*****************************************************************************
//define routes
//*****************************************************************************
  var title ="CPSC 6126 Term Project";
//*****************************************************************************
// Read File function to read data into arrays
app.locals.readFile = function(email,filename){
  var emailPathPrint = './Users/'+ email+'/'+filename;
  var file = fs.readFileSync('./Users/'+ email+'/'+filename, 'utf8');
  var array = new Array();
  array = file.split(",");
  return (array);
};
app.locals.readUsers = function(){
  var emailPathPrint = './Users/users.txt';
  var file = fs.readFileSync(emailPathPrint, 'utf8');
  var array = new Array();
  array = file.split(",");
  return (array);
};
//*****************************************************************************
// write File function to write data to file
app.locals.writeFile = function(email,filename,body){
  var emailPathPrint = './Users/'+ email+'/'+filename+'.txt';
  fs.writeFile(emailPathPrint,body, function(err){
  if(err) {
    console.log(err);
    return (err);
      }
    console.log("The file was saved!");
  });
};
//*****************************************************************************
//if '/' is called, display index.ejs
app.get('/', function(req, res) {
  //title ="Email Application";
  res.render('index.ejs',{
    title:title
  });
});
//*****************************************************************************
// if login is chosen, display login.ejs page
app.get('/login', function(req, res) {
  res.render('login.ejs', {
     message: req.flash('loginMessage'),
     title  : title
   });
});
//*****************************************************************************
// display signup.ejs if sign up link is selected
app.get('/signup', function(req, res) {
  res.render('signup.ejs', {
    message: req.flash('signupMessage'),
    title  : title
  });
});
//*****************************************************************************
//Display inbox.ejs if /index is clicked or redirected
app.get('/inbox', isLoggedIn, function(req, res) {
  res.render('inbox.ejs', {
    user : req.user, // get the user information from session
    title: title
  });
});
//*****************************************************************************
//Display setup.ejs when /setup is called
app.get('/setup', isLoggedIn, function(req, res) {
  res.render('setup.ejs', {
    user  : req.user, // get the user information from session
    title : title
  });
});
//*****************************************************************************
//Displays send.ejs for send form
app.get('/send', isLoggedIn, function(req, res) {
  res.render('send.ejs', {
    user  : req.user, // get the user information from session
    title : title
  });
});
//*****************************************************************************
//logs out user and redirects to index
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
//*****************************************************************************
// display login is successful, send to inbox, else send to login
app.post('/login', passport.authenticate('local-login', {
  successRedirect : '/inbox', // redirect to the inbox
  failureRedirect : '/login', // redirect back login if there is an error
  failureFlash : true // allow flash messages
}));
//*****************************************************************************
// send to setup.ejs for key generation, if signup errors send back to signup
app.post('/signup', passport.authenticate('local-signup', {
  successRedirect : '/setup', // redirect to complete key generation
  failureRedirect : '/signup',//redirect to signup page if there is an error
  failureFlash : true // allow flash messages
}));
//*****************************************************************************
//Setup processing, creates public and private keys, sends to inbox
app.post('/setup', isLoggedIn, function(req, res) {
  var email   = req.body.emailID;
  var name    = req.body.name;
  var secret  = req.body.secret;
  var options = {
        userIds: [{ name: name, email: email }], //user info
        numBits: 4096,// RSA key size
        passphrase: secret // protects the private key
  };
  openpgp.generateKey(options).then(function(key) {
    var privkey = key.privateKeyArmored; // PGP PRIVATE KEY
    var filename = email +'_private';
    app.locals.writeFile(email,filename,privkey);
    var pubkey = key.publicKeyArmored; // PGP PUBLIC KEY
    var filename = email +'_public';
    app.locals.writeFile (email,filename,pubkey);
  });
  res.render('inbox.ejs', {
    user  : req.user, // get the user information from session
    title : title
  });
});
//*****************************************************************************
// Displays email information
app.post('/email', isLoggedIn, function(req, res) {
  var emailID = req.body.emailID;
  var from    = req.body.fromEmail;
  var subject = req.body.subject;
  res.render('email.ejs', {
    user    : req.user, // get the user infromation from session
    req     : req,
    emailID : emailID,
    from    : from,
    subject : subject,
    title   : title
  });
});
//*****************************************************************************
// Displays reply form for email
app.post('/reply', isLoggedIn, function(req, res) {
  var emailID = req.body.emailID;
  var toEmail = req.body.fromID;
  var from    = req.body.toID;
  var subject = req.body.subject;
  var body    = req.body.body;
  res.render('reply.ejs', {
    user    : req.user, // get the user infromation from session
    req     : req,
    emailID : emailID,
    toEmail : toEmail,
    from    : from,
    subject : subject,
    body    : body,
    title   : title
  });
});
//*****************************************************************************
//Reads in encrypted email and decrypts email.Sends string to decryptedemail.ejs
app.post('/decrypt', isLoggedIn, function(req, res) {
  var emailTo     = req.body.emailTo;
  var from        = req.body.fromID;
  var subject     = req.body.subject;
  var emailID     = req.body.emailID;
  var passphrase  = req.body.secret;
  var decryptedText = new String();
  var options, encrypted;
  var arrayEncrypted = new Array();
  var decryptedTextArray = new Array();
  var filename = emailTo+"_private.txt";
  arrayPrivateKey = app.locals.readFile(emailTo,filename);
  var privkey = arrayPrivateKey.toString(); //encrypted private key
  arrayEncrypted = app.locals.readFile(emailTo,emailID);
  encrypted = arrayEncrypted.toString().replace(/%%%/g,' ').replace(/&&&/g,':');
  var privKeyObj = openpgp.key.readArmored(privkey).keys[0];
  privKeyObj.decrypt(passphrase);
  options = {
    message: openpgp.message.readArmored(encrypted), // parse armored message
    privateKey: privKeyObj // for decryption
  };
  async.series([
    function(callback){
      openpgp.decrypt(options).then(function(plaintext) {
        console.log("Step 1: decrypt");
        console.log(plaintext.data.toString());
        decryptedText = plaintext.data.toString();
        return plaintext.data;
      });
      callback(null,'decrypt');
    }
  ]);
  async.series({
    decrypt: function(callback){
      setTimeout(function() {
        callback(null, 1);
      }, 300);
    }, function(err, results) {
      res.render('decryptedemail.ejs', {
        user          : req.user, //get the user information from session
        emailTo       : emailTo,
        from          : from,
        subject       : subject,
        decryptedText : decryptedText,
        title         : title
      });
    }
  });
})
//*****************************************************************************
// sends email, decrypts body, writes email file and index to user directory
app.post('/send', isLoggedIn, function(req, res) {
  var timeStamp = Math.floor(Date.now() / 1000);
  var body = req.body.emailBody;
  var emailTo = req.body.toID;
  var emailFrom = req.body.fromID;
  var subject = req.body.subject;
  arrayPublicKey = new Array();
  var filename = emailTo+"_public.txt";
  arrayPublicKey = app.locals.readFile(emailTo,filename);
  var options, encrypted;
  var pubkey = arrayPublicKey.toString();
  var fileName = timeStamp + subject;
  var modifiedFileName = fileName.replace(/ /g,'%%%').replace(/:/g,'');
  options = {
    data: body.toString(), // input as String (or Uint8Array)
    publicKeys: openpgp.key.readArmored(pubkey).keys,  // for encryption
  };
  openpgp.encrypt(options).then(function(ciphertext) {
    encrypted = ciphertext.data; // PGP MESSAGE
    var encryptBody = encrypted.toString();
    var writeText = encryptBody.replace(/:/g,'&&&').replace(/ /g,'%%%');
    app.locals.writeFile(emailTo,modifiedFileName,writeText);
  });
  var indexArray = new Array();
  indexArray = app.locals.readFile(emailTo,emailTo+'_index.txt');
  var arrayLength = indexArray.length - 1;
  if(indexArray[0].toString() !== ""){
    indexArray[arrayLength] = indexArray[arrayLength]+",";
  }else{
    indexArray[arrayLength] = indexArray[arrayLength];
  };
  var indexString = indexArray.toString()+"\r\n"+emailFrom+":"+subject.replace(/:/g,'&&&')+":"+modifiedFileName+".txt";
  app.locals.writeFile(emailTo,emailTo+'_index',indexString);
  res.render('success.ejs', {
    user  : req.user, // get the user information from  session
    title : title
  });
});
//*****************************************************************************
// Displays email information
app.post('/delete', isLoggedIn, function(req, res) {
  var emailID = req.body.emailID;
  var toEmail    = req.body.toEmail;
  var fromEmail    = req.body.fromEmail;
  var subject = req.body.subject;
  var emailID = req.body.emailID;
  var i = 0;
  console.log(emailID);
  var path = './Users/'+ toEmail+'/'+emailID;
  fs.unlink(path, function(err){
    if (err) throw err;
    console.log(path + " deleted");
  });
  var index = toEmail+"_index.txt";
  indexArray = new Array();
  printArray = new Array();
  tempArray = new Array();
  var stringCheck = fromEmail + ":"+subject+":"+emailID;
  var stringArray;
  indexArray = app.locals.readFile(toEmail,index);
  if (indexArray[0] !=""){
    for (i = 0; i < indexArray.length; i++ ){
      stringArray = indexArray[i].toString();
      if (stringArray.includes(stringCheck)){
      }else{
        printArray.push(indexArray[i].toString());
      }
    }
    var writeString = printArray.toString();
    app.locals.writeFile(toEmail,toEmail+'_index',writeString);
  }
  res.render('success.ejs', {
    user    : req.user, // get the user infromation from session
    req     : req,
    emailID : emailID,
    fromEmail   : fromEmail,
    subject : subject,
    title   : title
  });
});
//*****************************************************************************
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, continue
    if (req.isAuthenticated())
      return next();
    // if not redirect index.ejs
    res.redirect('/');
};
//*****************************************************************************
//print port to console
app.listen(port);
  console.log('Ready on port '+ port);
