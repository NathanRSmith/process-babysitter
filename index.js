var CONFIG = require('config');

var _ = require('lodash');
var path = require('path');
var spawn = require('child_process').spawn;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var miss = require('mississippi');
var SplitStream = require('split2');

var processes = _.chain(CONFIG.processes)
  .map(function(v, k) {
    return {
      id: v.id,
      config: v,
      status: 'stopped',
      stdout_100: [],
      stderr_100: [],
      command_tpl: _.template(v.command),
      cwd_tpl: _.template(v.cwd),
      args_tpls: _.map(v.args, function(v) {
        return _.template(v);
      }),
    };
  })
  .keyBy('config.id')
  .value();

function pushCircular(arr, item, limit) {
  arr.push(item);
  if(arr.length > limit) arr.shift();
  return arr;
}

/**************************** ROUTES ****************************/
app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'templates/index.html'));
});
app.use('/static', express.static('static'));

app.get('/process', function(req, res) {
  res.json(_.map(processes, function(v) {
    return _.pick(v, ['id', 'config', 'status', 'uptime', 'stdout_100', 'stderr_100']);
  }));
});
app.post('/process/:id/start', function(req, res) {
  if(!processes[req.params.id]) return res.sendStatus(404);
  var proc = processes[req.params.id];
  if(proc.child) return res.sendStatus(200);
  proc.child = spawn(
    proc.command_tpl(CONFIG.template_vars),
    _.map(proc.args_tpls, function(v) { return v(CONFIG.template_vars); }),
    {cwd: proc.cwd_tpl(CONFIG.template_vars)}
  );


  proc.child.on('exit', function() {
    console.log(proc.id+' stopped');
    proc.status = 'stopped';
    io.sockets.emit('process:'+proc.id+':stopped')
    // proc.child.stdout.pipe(process.stdout);
    // proc.child.stderr.unpipe(process.stderr);
    delete proc.child;
  });

  miss.pipe(
    proc.child.stdout,
    SplitStream(),
    // process.stdout,
    miss.through.obj(function(data, enc, cb) {
      io.sockets.emit('process:'+proc.id+':stdout', data);
      pushCircular(proc.stdout_100, data, 100);
      cb();
    }),
    function(err) { if(err) console.error(err); } // no-op
  );
  miss.pipe(
    proc.child.stderr,
    SplitStream(),
    // process.stderr,
    miss.through.obj(function(data, enc, cb) {
      io.sockets.emit('process:'+proc.id+':stderr', data);
      pushCircular(proc.stderr_100, data, 100);
      cb();
    }),
    function(err) { if(err) console.error(err); } // no-op
  );


  proc.status = 'started';
  io.sockets.emit('process:'+proc.id+':started');
  console.log(proc.config.id+' started');
  return res.sendStatus(200);
});
app.post('/process/:id/stop', function(req, res) {
  if(!processes[req.params.id]) return res.sendStatus(404);
  var proc = processes[req.params.id];
  if(!proc.child) return res.sendStatus(200);
  proc.child.kill();
  return res.sendStatus(200);
});



/**************************** EVENTS ****************************/
io.on('connection', function(socket){
  console.log('a user connected');
});








http.listen(CONFIG.server.port, function(){
  console.log('listening on *:'+CONFIG.server.port);
});

process.on('exit', function() {
  console.log('killing', children.length, 'child processes');
  _.each(processes, function(process) {
    if(process.child) process.child.kill();
  });
});
