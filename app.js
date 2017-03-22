var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var app = express();

//configure app

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//use middleware

app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'bower_components/')));
//define routes
var todoitems = [
  {id: 1, desc: 'foo'},
  {id: 2, desc: 'bar'},
  {id: 3, desc: 'baz'}
];

app.get('/test', function(req, res){
    res.render('test',{
      title: 'My App',
      items: todoitems
    });
});
app.get('/', function(req, res){
    res.render('index',{
      title: 'My App',
      items: todoitems
    });
});

app.post('/add', function(req, res){
    var newItem = req.body.newItem;
    console.log(newItem);
    todoitems.push({
      id: todoitems.length+1,
      desc: newItem
    });
    res.redirect('/');
})

app.listen(1337, function(){
  console.log('Ready on port 1337');
});


// const http = require('http');
//
// const hostname = '127.0.0.1';
// const port = 3000;
//
// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.end('Hello World\n');
// });
//
// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });
