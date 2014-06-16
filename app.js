var program = require('commander');
var io = require('socket.io');

function parseIntNoRadix(str, radix) {
    return parseInt(str);
}

program
    .version('0.0.2')
    .usage('[options]')
    .option('-l, --loginterval <n>', 'Logging interval in seconds [2]', parseIntNoRadix, 2)
    .option('-p, --port <n>', 'Server port [3000]', parseIntNoRadix, 3000)
    .parse(process.argv);

var server = io.listen(program.port);

var users = 0;
var countReceived = 0;
var countSended = 0;
var connecting = 0;
var disconnecting = 0;

function roundNumber(num, precision) {
  return parseFloat(Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision));
}

/**
 * Logging
 */
setInterval(function() {
    var auxReceived = roundNumber(countReceived / users / program.loginterval, 1)
    var msuReceived = (users > 0 ? auxReceived : 0);

    var auxSended = roundNumber(countSended / users / program.loginterval, 1)
    var msuSended = (users > 0 ? auxSended : 0);

    var l = [
        'usr: ' + users + ' (+' + connecting + '/-' + disconnecting + ')',
        'recv/sec: ' + countReceived,
        'sent/sec: ' + countSended,
        'recv/sec/usr: ' + msuReceived,
        'sent/sec/usr: ' + msuSended
    ];

    console.log(l.join(',\t'));
    countReceived = 0;
    countSended = 0;
    connecting = 0;
    disconnecting = 0;

}, program.loginterval*1000);

/**
 * Counting connections and ping/pong messages
 */
server.sockets.on('connection', function(socket) {

    users++;
    connecting++;

    socket.on('message', function(message) {
        socket.send(message);
        countReceived++;
        countSended++;
    });

    socket.on('broadcast', function(message) {
        countReceived++;
        server.sockets.emit('broadcast', message);
        countSended += users;
        socket.emit('broadcastOk');
    });

    socket.on('disconnect', function() {
        users--;
        disconnecting++;
    });
});
