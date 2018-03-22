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


    app.use(function (req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

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
server.listen(7200);  //listen on port 80

//var io=require('socket.io').listen(app);
//app.listen(6000); // PORT
io.sockets.on('connection', function(socket) {
  var room = "";
  var reservationRoom = "";
  var carsOnQueue = {};
      carsOnQueue["queuedCars"] = {};
  var totalQueue = "";
  var availableSLots = "";
  var unavailableSLots = "";
  var totalSLots = "";


  connection.query('SELECT * FROM notifications ORDER BY id DESC',0, function(err, rows){
    socket.emit('fetchNotification', rows);
  });

  socket.on('createNotif', function( data ) {
    console.log("======================notif called===================");
    room = data.branchId;

    socket.join(room);
    /*if(data.notifText == "parked out"){
      connection.query('UPDATE notifications SET parkOutDateTime = ? WHERE text = ?', [data.parkOutDateTime, data.notifText])
    }*/
    var textField = data.fullname + " " + data.notifText;
    var newDate = new Date();
    if(data.notifText == "parked out"){
      console.log("parkout is the process");
      var sql = "INSERT INTO notifications (reservation_id, text, seen, user_id, create_date, update_date, branch_id, parkOutDateTime, total_amount) VALUES ?";
      var values = [
          [data.reservationId, textField, 1, data.userId, newDate, newDate, data.branchId, data.parkOutDateTime, data.total_amount]
      ];
    }else{
      console.log("else is the process");
      var sql = "INSERT INTO notifications (reservation_id, text, seen, user_id, create_date, update_date, branch_id, parkOutDateTime) VALUES ?";
      var values = [
          [data.reservationId, textField, 1, data.userId, newDate, newDate, data.branchId, data.parkOutDateTime]
      ];
    }

    connection.query(sql, [values], function(err, result) {
        if (err) throw err;
        connection.query('SELECT * FROM notifications WHERE id ='+ result.insertId ,0, function(err, resultLastInserted){
          console.log("last inserted--> " + JSON.stringify(resultLastInserted));
          io.sockets.in(room).emit('notifJoined', resultLastInserted);
        });
    });



  });

  socket.on('joinRoom', function(data){
    room = data.room;
    console.log("ROOM----> " + data.room)
    socket.join(data.room);

  });

  socket.on('joinReservationRoom', function(data){
    console.log("RESERVATION ROOM--> " + data.room)
    socket.join(data.room);
  });

  socket.on('queueOnBranch',function(data){
    //room = data.branchId;
    //socket.join(data.branchId);
    var branchId = data.branchId;
    connection.query('SELECT COUNT(*) AS queue FROM queue WHERE action = "add" && branch_id ='+ branchId,0, function(err, result){
      console.log("results from queue on branch--> " + JSON.stringify(result));
      totalQueue = result[0].queue;
      var response = {"branchId" : data.branchId, "queue" : totalQueue}
      io.sockets.in(room).emit('fetchQueueOnBranch', response);
    });
  });


  socket.on('addToQueue', function(data){
    var where = 'plate_number LIKE ? AND branch_id = ? AND action LIKE ?';
    var values = [ '%'+ data.plateNumber +'%', data.branchId, '%add%' ];
    var sqlForQueue = 'SELECT * FROM queue WHERE ' + where;
    connection.query(sqlForQueue, values, function(err, results) {
      if(results.length > 0){
        var response = {"result" : "failed", "message" : "Plate number is already queued"}
        io.sockets.in(room).emit('newQueueInserted', response);
      }else{
        console.log("----->" + JSON.stringify(results));
        connection.query('DELETE FROM queue WHERE plate_number = ?', [data.plateNumber])
        var sql = "INSERT INTO queue (status, action, user_id, dateTime, platform, branch_id, plate_number, is_queued) VALUES ?";
        var newDate = new Date();
        var isQueuedValue = "true";
        var values = [[data.status, data.action, data.userId, newDate, data.platform, data.branchId, data.plateNumber, isQueuedValue]];
        connection.query(sql, [values], function(err, result) {
            if (err) throw err;
            connection.query('SELECT * FROM queue WHERE id ='+ result.insertId ,0, function(err, resultLastInserted){
              console.log("last inserted for queue--> " + JSON.stringify(resultLastInserted));
              io.sockets.in(room).emit('newQueueInserted', resultLastInserted);
            });
        });
      }
      //socket.leave(room);
    });
  });


  socket.on('removeToQueue', function(data){
    var isQueuedValue = "false";
    connection.query('UPDATE queue SET action = ?, status = ?, is_queued = ? WHERE plate_number = ?', [data.action,data.status, isQueuedValue,data.plateNumber])
    var results = {"message": "success", "result" : data.plateNumber + " has been disconnected", "plate_number" : data.plateNumber}
    io.sockets.in(data.branchId).emit('removedUserToQueue', results);
    socket.leave(room);
  });

  socket.on('fetchParkingDetails', function(data){
    var branchIdParking = data.branchId;
    reservationRoom = data.branchId;
    console.log("ROOM for fetchParkingDetails-> " + data.branchId)
    socket.join(data.branchId);

    console.log("fetchParkingDetails check room--> " + branchIdParking);
    connection.query('SELECT COUNT(*) AS availableSLots FROM parking_spaces WHERE availability = "" && branch_id =' + branchIdParking ,0, function(err, result){
      availableSLots = result[0].availableSLots;
        connection.query('SELECT COUNT(*) AS totalSLots FROM parking_spaces WHERE branch_id =' + branchIdParking ,0, function(err, result){
          totalSLots = result[0].totalSLots;
          var response = {"branchId" : data.branchId, "availableSlots" : availableSLots, "totalSlots" : totalSLots}
          io.sockets.in(reservationRoom).emit('parkingDetails', response);
          console.log("response--> " + JSON.stringify(response));
        });
    });
  });

  socket.on('fetchPostData', function(data){
    console.log("TEST DATA--> " + data.field);
    connection.query("select * from notification where id = 2", 0, function(err, results){
      console.log("RESULTS FOR FETCH DATA--> " + JSON.stringify(results));
      io.sockets.in(data.field).emit('submitData', results);
    });
  });



  socket.on('fetchParkingSlots', function(data){
    console.log("BRANCHID---> " + data.parkingSpaceId)
    reservationRoom = data.branchId;
    socket.join(reservationRoom);

    var parkingSpaceId = data.parkingSpaceId;

    connection.query('SELECT * FROM parking_spaces WHERE id ='+ parkingSpaceId,0, function(err, result){
      console.log("RESULTS FOR FETCH PARKING SPACES-->" + JSON.stringify(result));
      io.sockets.in(reservationRoom).emit('realTimeParkoutSlot', result);
    });
  });

  socket.on('fetchNewParkinSlot', function(data){
    console.log("PARK IN PARKING SPACE ID---> " + data.parkingSpaceId);
    console.log("PARK IN BRANCH ID---> " + data.branchId);
    reservationRoom = data.branchId;
    socket.join(reservationRoom);
    var parkingSpaceId = data.parkingSpaceId;
    connection.query('SELECT * FROM parking_spaces WHERE id ='+ parkingSpaceId,0, function(err, result){
      console.log("RESULTS FOR NEW PARKING SPACE-->" + JSON.stringify(result));
      io.sockets.in(reservationRoom).emit('realTimeParkinSlot', result);
    });
  });




























  socket.on('fetchAvailableSlotsCount', function(data){
    connection.query('SELECT COUNT(*) AS availableSLots FROM parking_spaces WHERE availability = "reserved" && branch_id =' + room ,0, function(err, result){
      console.log("AVAILABLE SLOTS COUNT-->" + JSON.stringify(result));
      io.sockets.in(room).emit('realTimeAvailableSlotsCount', result);
    });
  });

  socket.on('fetchUnavailableSlotsCount', function(data){
    connection.query('SELECT COUNT(*) AS unavailableSLots FROM parking_spaces WHERE availability = "" && branch_id =' + room ,0, function(err, result){
      console.log("AVAILABLE SLOTS COUNT-->" + JSON.stringify(result));
      io.sockets.in(room).emit('realTimeUnavailableSlotsCount', result);
    });
  });

  socket.on('fetchParkingSlotsCount', function(data){
    connection.query('SELECT COUNT(*) AS totalSLots FROM parking_spaces WHERE branch_id =' + room ,0, function(err, result){
      console.log("TOTAL SLOTS COUNT-->" + JSON.stringify(result));
      io.sockets.in(room).emit('realTimeParkingSlotsCount', result);
    });
  });




});

module.exports = app;
