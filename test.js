process.binding('natives').cluster = process.binding('natives').cluster + '\ncluster.serverHandlers = serverHandlers';
var Cluster = require('cluster'); 
var Http = require('http');
var Util = require('util');
var ChildProcess  = require('child_process');
var argv = {};
process.argv.forEach(function (arg) {
  arg = arg.split('=');
  argv[arg[0]] = arg[1] !== undefined ? arg[1] : true; 
});
argv.generation = Number(argv.generation) || 0;
var serve = function () {
  var counter = 0;
  Http.createServer(function(req, res) {
    if (req.url.match(/\/reload.*/)) {
      process.send('reload'); 
    }
    console.log(argv.generation);
    var cnt = new Buffer("hello world\n");
    res.writeHead(200, {'content-length': cnt.length, 'content-type': 'text/plain'});
    res.end(cnt);
  }).listen(8000);
};
var fork = function () {
  Cluster.fork().on('message', function (msg) {
    if (msg === 'reload') {
      console.log('asked to reload');
      var secondMaster,
        key;
      secondMaster = ChildProcess.fork(__filename, ['generation=' + (argv.generation + 1) ]);
      key = Object.keys(Cluster.serverHandlers)[0];
      secondMaster.send(key, Cluster.serverHandlers[key]); 
      secondMaster.unref();
      process.exit();
    }
  });
};
var start = function () {
  if (Cluster.isMaster) {
    console.log('start cluster master ' + argv.generation);
    if (process.send) {
      process.on('message', function (message, socket) {
        Cluster.serverHandlers[message] = socket;
        fork();
      });
    } else { 
      fork();
    }
  } else {
    console.log('start worker ' + argv.generation);
    serve();
  }
};
start();
