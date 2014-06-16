var program = require('commander');
var cluster = require('cluster');
var io = require('socket.io-client');

function parseIntNoRadix(str, radix) {
    return parseInt(str);
}

if (cluster.isMaster) {
    program
        .version('0.0.2')
        .usage('[options]')
        .option('-p, --port <n>', 'Port to connect to [3000]', parseIntNoRadix, 3000)
        .option('-h, --host <name>', 'Host to connect to [127.0.0.1]', '127.0.0.1')
        .option('-w, --workers <n>', 'Number of worker processes to fork [3]', parseIntNoRadix, 3)
        .option('-c, --connections <n>', 'Number of connections per worker [50]', parseIntNoRadix, 50)
        .option('-r, --rampup <n>', 'Ramp up time for connections in seconds [10]', parseIntNoRadix, 10)
        .option('-d, --duration <n>', 'Duration of benchmark after ramp up time in seconds [30]', parseIntNoRadix, 30)
        .option('-b, --broadcast <n>', 'Number of connections per worker that should broadcast [0]', parseIntNoRadix, 0)
        .option('-s, --size <n>', 'Message size in bytes [50]', parseIntNoRadix, 50)
        .parse(process.argv);

    console.log("Starting workers...");
    for (var i = 0; i < program.workers; i++) {
        var worker = cluster.fork(program);
    }
}
else if (cluster.isWorker) {
    var newUserTimeout = process.env.rampup * 1000 / process.env.connections;
    var message = new Array(process.env.size).join('x');
    var sockets = [];
    console.log("Ramping up...");

    for (var i = 0; i < process.env.connections; i++) {
        setTimeout(function() { user(process.env.host, process.env.port) }, i * newUserTimeout);
    }
    setTimeout(function() {
        console.log("All users up - benchmarking")
    }, process.env.connections * newUserTimeout);

    setTimeout(function() {
        console.log('Done - closing connections and exiting');
        for (var i = 0; i < sockets.length; i++) {
            sockets[i].disconnect();
        }
        process.exit(0);
    }, process.env.connections*newUserTimeout + process.env.duration*1000);

    function user(host, port) {
        var socket = io.connect('http://' + host + ':' + port, {
            'multiplex': false
        });
        sockets.push(socket);

        socket.on('connect', function() {
            // Start messaging loop
            if (process.env.broadcast > 0) {
                socket.emit('broadcast', message);
                process.env.broadcast--;
            }
            else {
                socket.send(message);
            }

            socket.on('message', function(message) {
                socket.send(message);
            });

            socket.on('broadcastOk', function() {
                socket.emit('broadcast', message);
            });
        });
    };
}