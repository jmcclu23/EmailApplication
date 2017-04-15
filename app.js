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
app.locals.readFile = function(email,filename){
  var emailPathPrint = './Users/'+ email+'/'+filename;
  var file = fs.readFileSync('./Users/'+ email+'/'+filename, 'utf8');
  var array = new Array();
  array = file.split(",");
  return (array);
};
app.locals.writeFile = function(email,filename,body){
  var emailPathPrint = './Users/'+ email+'/'+filename+'.txt';
  fs.writeFile(emailPathPrint,body, function(err){
  if(err) {
    return console.log(err);
      }
    console.log("The file was saved!");
  });
};
app.get('/', function(req, res) {
  title ="Email Application";
  res.render('index.ejs');
});
app.get('/login', function(req, res) {
  res.render('login.ejs', { message: req.flash('loginMessage') });
});
app.post('/login', passport.authenticate('local-login', {
  successRedirect : '/profile', // redirect to the secure profile section
  failureRedirect : '/login', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));
app.get('/signup', function(req, res) {
  res.render('signup.ejs', { message: req.flash('signupMessage') });
});
app.post('/signup', passport.authenticate('local-signup', {
  successRedirect : '/setup', // redirect to the secure profile section
  failureRedirect : '/signup', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));
app.get('/profile', isLoggedIn, function(req, res) {
  res.render('profile.ejs', {
    user : req.user // get the user out of session and pass to template
  });
});
app.get('/setup', isLoggedIn, function(req, res) {
  res.render('setup.ejs', {
    user : req.user // get the user out of session and pass to template
  });
});
app.post('/setup', isLoggedIn, function(req, res) {
  var email   = req.body.emailID;
  var name    = req.body.name;
  var secret  = req.body.secret;
  var options = {
        userIds: [{ name: name, email: email }], // multiple user IDs
        numBits: 4096,                                            // RSA key size
        passphrase: secret         // protects the private key
  };
  openpgp.generateKey(options).then(function(key) {
    var privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
    var filename = email +'_private';
    app.locals.writeFile(email,filename,privkey);
    var pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
    var filename = email +'_public';
    app.locals.writeFile (email,filename,pubkey);
  });
  res.render('profile.ejs', {
    user : req.user, // get the user out of session and pass to template
  });
});
app.post('/email', isLoggedIn, function(req, res) {
  var emailID = req.body.emailID;
  var from    = req.body.fromEmail;
  var subject = req.body.subject;

  console.log("From: "+ from);
  res.render('email.ejs', {
    user    : req.user, // get the user out of session and pass to template
    req     : req,
    emailID : emailID,
    from    : from,
    subject : subject
  });
});
app.post('/reply', isLoggedIn, function(req, res) {
  var emailID = req.body.emailID;
  var toEmail = req.body.fromID;
  var from    = req.body.toID;
  var subject = req.body.subject;
  var body    = req.body.body;
  res.render('reply.ejs', {
    user    : req.user, // get the user out of session and pass to template
    req     : req,
    emailID : emailID,
    toEmail : toEmail,
    from    : from,
    subject : subject,
    body    : body
  });
});
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
  //var passphrase = 'test phrase'; //what the privKey is encrypted with
  arrayEncrypted = app.locals.readFile(emailTo,emailID);
  encrypted = arrayEncrypted.toString().replace(/%%%/g,' ').replace(/&&&/g,':');
  var privKeyObj = openpgp.key.readArmored(privkey).keys[0];
  privKeyObj.decrypt(passphrase);
  options = {
    message: openpgp.message.readArmored(encrypted),     // parse armored message
    privateKey: privKeyObj // for decryption
  };
  async.series([
    function(callback){
      openpgp.decrypt(options).then(function(plaintext) {
        app.locals.writeFile(emailTo,"temp",plaintext.data);
      return plaintext.data; // 'Hello, World!'
    });
    console.log("Step 1: decrypt");
    callback(null,'decrypt');
  },
    function(callback){
      var emailPath = './Users/'+emailTo+'/temp.txt'
      //decryptedTextArray = app.locals.readFile(emailTo,"temp.txt");
      fs.readFile(emailPath, 'utf8', (err, data) => {
        if (err) throw err;
        console.log("Step 2: read decrypted email");
        console.log(data.toString());
        decryptedText = data;
      });
      callback(null,'read');
    },
    function(callback){
      app.locals.writeFile(emailTo,"temp"," ");
      callback(null,'erase');
    }
  ]);;
  async.series({
    decrypt: function(callback){
      setTimeout(function() {
            callback(null, 1);
        }, 300);
    },
    read: function(callback){
       setTimeout(function() {
            callback(null, 1);
        }, 200);
    },
    erase: function(callback){
        setTimeout(function() {
            callback(null, 3);
        }, 100);
    }
}, function(err, results) {
  res.render('decryptedemail.ejs', {
    user          : req.user, // get the user out of session and pass to template
    emailTo       : emailTo,
    from          : from,
    subject       : subject,
    decryptedText : decryptedText
});
});

});
app.post('/send', isLoggedIn, function(req, res) {
  var timeStamp = Math.floor(Date.now() / 1000);
  var body = req.body.emailBody;       //email contents
  var emailTo = req.body.toID;        //to email
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
    data: body.toString(),                             // input as String (or Uint8Array)
    publicKeys: openpgp.key.readArmored(pubkey).keys,  // for encryption
  };
  openpgp.encrypt(options).then(function(ciphertext) {
    encrypted = ciphertext.data; // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
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
    user : req.user, // get the user out of session and pass to template
  });
});
app.get('/send', isLoggedIn, function(req, res) {
  res.render('send.ejs', {
  user : req.user // get the user out of session and pass to template
  });
});
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
      return next();
    // if they aren't redirect them to the home page
    res.redirect('/');
};
app.listen(port);
  console.log('Ready on port '+ port);
