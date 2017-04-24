// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
// load up the user model
var User            = require('../models/user');
var fs              = require('fs');
// expose this function to our app using module.exports
module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
  passport.use('local-signup', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) {
    process.nextTick(function() {
      User.findOne({ 'local.email' :  email }, function(err, user) {
        if (err)
          return done(err);
        if (user) {
          return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        } else {
            var newUser            = new User();
            var newDirectory       = './Users/'+ email;
            if (!fs.existsSync(newDirectory)){
              fs.mkdirSync(newDirectory);
            };
            fs.writeFile(newDirectory+'/'+email+'_index.txt',"",function(err){
              if(err){
                return console.log(err);
              }
              console.log("The file was saved!");
            });
            var file = fs.readFileSync('./Users/users.txt', 'utf8');
            console.log("File Size: " + file.length);
            if(!file || file.length === 0){
              fs.writeFile('./Users/users.txt',email,function(err){
                if(err){
                  return console.log(err);
                }
                  console.log("The file was saved!");
              });
            }else{
              console.log("enetered Loop to add array")
              var array = new Array();
              array = file.split(",");
              // if(array.length === 0){
              //   array.pop(file);
              // }
              array.push(email);
              var stringWrite = array.toString();
              console.log("array size: "+array.length);
              console.log(stringWrite);
              fs.writeFile('./Users/users.txt',stringWrite,function(err){
                if(err){
                  return console.log(err);
                }
                  console.log("The file was saved!");
              });
            }
            newUser.local.email    = email;
            newUser.local.name = req.body.name;
            newUser.local.password = newUser.generateHash(password);
            newUser.save(function(err) {
            if (err)
              throw err;
            return done(null, newUser);
            });
          }
        });
      });
    })
  );
  passport.use('local-login', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, email, password, done) { // callback with email and password from our form
    User.findOne({ 'local.email' :  email }, function(err, user) {
        if (err)
          return done(err);
        if (!user)
          return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
        if (!user.validPassword(password))
          return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
        return done(null, user);
      });
   }));
};
