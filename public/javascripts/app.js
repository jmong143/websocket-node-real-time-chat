
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , config = require('./config')
  , mysql  = require('mysql')
  , connection = mysql.createConnection({
    	host     : 'localhost',
    	user     : 'root',
    	password : '',
    	port     : 3306,
      multipleStatements: true
   });

  connection.query("USE stardibs");

var connectCounter = 0;
var tempFlag = 0;

var all_items_raw=config.init_news, all_items=[], ts_base=0.001;
function gg() {
	return (new Date()).getTime();
}
for(var i=0;i<all_items_raw.length;i++) {
  var temp = {};

  temp['time'] = (gg()+ts_base).toString();
  temp['bid'] = all_items_raw[i];
  temp['sessionId'] = "Mariano Mejia";
  temp["itemId"]=-1;

  all_items.push(temp);

  ts_base+=0.001; // to make the key unique
}
var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('adminpass', config.adminpass);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(logErrors);
  app.use(clientErrorHandler);
  app.use(errorHandler);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Error Handler

app.enable('verbose errors');

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.send(500, { error: 'Something blew up!' });
  } else {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}


app.all('*', function(req, res, next){
res.header('Access-Control-Allow-Origin', "*");
  if (!req.get('Origin')) return next();
  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  // res.set('Access-Control-Allow-Max-Age', 3600);
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});

// Routes

app.get('/', routes.index);
app.get('/helloworld', routes.helloworld);
app.get('/product', routes.product_pub(connection));
app.get('/bid', routes.bid(connection));

app.post('/api', routes.api);

//---------------------------------------------------
app.get('/won', routes.won);
app.get('/watchlist', routes.watchlist);
app.get('/testimonials', routes.testimonials);
app.get('/terms', routes.terms);
app.get('/shippinginfo', routes.shippinginfo);
app.get('/register_validate', routes.register_validate);
app.get('/register_success', routes.register_success);
app.get('/register', routes.register);
app.get('/referrals', routes.referrals);
app.get('/privacy', routes.privacy);
app.get('/payment-methods', routes.paymentmethods);
app.get('/old-index', routes.oldindex);
app.get('/newsletter', routes.newsletter);
app.get('/myautodibber', routes.myautodibber);
app.get('/myauctions', routes.myauctions);
app.get('/loggedin', routes.loggedin);
app.get('/items', routes.items);
app.get('/index', routes.index);
app.get('/how', routes.how);
app.get('/history', routes.historylog);
app.get('/forgot', routes.forgot);
app.get('/faq', routes.faq);
app.get('/contact', routes.contact);
app.get('/close', routes.closepage);
app.get('/claim', routes.claim);
app.get('/changepassword', routes.changepassword);
app.get('/buy-stars', routes.buystars);
app.get('/buy-star', routes.buystar);
app.get('/account-details', routes.accountdetails);
app.get('/about', routes.about);
app.get('/404', routes.page404);

//---------------------------------------------------

var io=require('socket.io').listen(app);
app.listen(3000); // PORT
io.sockets.on('connection', function( socket ) {


	// index / home
	socket.on( 'getLatestProductItem', function( data ) {
        connection.query('SELECT * FROM stardibs_products LIMIT 0,8',0, function(err, rows){

			console.log("query data results:"+JSON.stringify(rows));
			socket.emit('getLatestProductItem',rows);
        });
	});

	socket.on( 'getLatestBidTracker', function( data ) {

		item_id = data.item_id;

		console.log('getLatestBidTracker:', data.item_id,item_id);
        connection.query('SELECT * FROM stardibs_bid_tracker WHERE stardibs_bid_tracker.item_id = ' + item_id + ' ORDER BY stardibs_bid_tracker.id DESC LIMIT 1',0, function(err, bidTracker){


			console.log("query data results:"+JSON.stringify(bidTracker));
			socket.emit('getLatestBidTracker',bidTracker);
        });
	});


	socket.on ('testPHPSocket', function (data) {

		console.log("testPHPSocket");
		socket.emit('testPHPSocket','Hello World');

	});

});
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
