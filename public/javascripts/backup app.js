var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

//var app = express();
//var http = require('http');

var http = require('http');
var express = require('express'),
    app = module.exports.app = express();



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


var mysql  = require('mysql');
var connection = mysql.createConnection({
    	host     : 'localhost',
    	user     : 'root',
    	password : '',
    	port     : 3306,
      multipleStatements: true
});

connection.query("USE spottapark");

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var server = http.createServer(app);
var io = require('socket.io').listen(server);  //pass a http.Server instance
server.listen(7000);  //listen on port 80

//var io=require('socket.io').listen(app);
//app.listen(6000); // PORT
io.sockets.on('connection', function(socket) {
  console.log("connected to mysql");
  connection.query('SELECT * FROM tbl_sample_notif',0, function(err, rows){
      socket.emit('premiumFeeResults', rows);
      console.log("query data results:" +JSON.stringify(rows));
  });

  socket.on( 'fetchPremiumFee', function( data ) {
      connection.query('SELECT * FROM tbl_sample_notif',0, function(err, rows){
          console.log("query data results:"+JSON.stringify(rows));
          io.emit('premiumFeeResults', rows);
      });
  });

  socket.on('createNotif', function(data){
    console.log("notif data--> " + JSON.stringify(data));
    var sql = "INSERT INTO tbl_sample_notif (notif_name, notif_details, notif_branch_id) VALUES ?";
    var values = [
        [data.notif_name, data.notif_details, data.notif_branch_id]
    ];
    connection.query(sql, [values], function(err) {
        if (err) throw err;
        socket.emit('premiumFeeResults', [data]);
        //connection.end();
    });
  })


});
//console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

module.exports = app;
