var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var app = express();

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

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

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

//var mongo = require('mongodb').MongoClient;
var Conversation = require('./models/conversation');
var mongoose = require('mongoose');

var server = app.listen(5100);
var io = require('socket.io').listen(server);
mongoose.connect('mongodb://127.0.0.1/michaelDB', function(err, db){
  if(err) throw err;
  io.sockets.on('connection', function(socket){
    var room = "";
    console.log("Connected: %s", socket.id);

    //JOIN ROOM
    socket.on('joinRoom', function(data){
      room = data.room;
      socket.join(room);
    });

    socket.on('leaveRoom', function(data){
      socket.leave(room);
      room = "";
      var response = {};
      if(room == ""){
        response = {status: "success"}
      }else{
        response = {status: "failed"}
      }
      socket.emit('leaveRoomResult', response)
    });

    socket.on('getCurrentRoom', function(data){
      io.sockets.in(room).emit('currentRoom', {room: room});
    });

    socket.on('getConvoList', function(data){
      Conversation.find({room: room}, function(err, list){
        if(err){
          console.log("THERES AN ERROR" + err);
        }
          io.sockets.in(room).emit('convoLists', list);
      });
    });

    socket.on('newMessageProcess', function(data){
      var newConvo = new Conversation();
          newConvo.room = room,
          newConvo.username = data.username,
          newConvo.message = data.message,
          newConvo.sticker = data.sticker,
          newConvo.createdAt = new Date();
					newConvo.updatedAt = new Date();
          newConvo.save(function(err, result) {
            if(err){
              console.log("ERROR--> " + JSON.stringify(err))
            }
            Conversation.findOne({ "_id": result._id }, function (err, latestList) {
              io.sockets.in(room).emit('latestConvo', latestList);
            });
          });

    });





  });

});

//console.log('WEB SOCKET WORKING')



module.exports = app;
