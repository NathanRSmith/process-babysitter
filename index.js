var CONFIG = require('config');

var _ = require('lodash');
var path = require('path');
var spawn = require('child_process').spawn;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var miss = require('mississippi');

var processes = _.chain(CONFIG.processes)
  .map(function(v, k) {
    return {
      config: v,
      command_tpl: _.template(v.command),
      cwd_tpl: _.template(v.cwd),
      args_tpls: _.map(v.args, function(v) {
        return _.template(v);
      })
    };
  })
  .keyBy('config.id')
  .value();

/**************************** ROUTES ****************************/
app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'templates/index.html'));
});
app.use('/static', express.static('static'));

app.get('/process', function(req, res) {
  res.json(_.map(processes, function(v) {
    return _.pick(v, ['config', 'status', 'uptime']);
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
    console.log('stopped');
    proc.status = 'stopped';
    delete proc.child;
  });


  // var thru = miss.through(function(data, enc, cb) {
  //   if(!_.isNull(data)) {
  //     return cb(null, data);
  //   }
  //   console.log('here')
  //   cb();
  //   thru.destroy();
  // });
  // proc.child.stderr.pipe(thru).pipe(process.stdout);
  // proc.child.stdout.pipe(thru);


  proc.child.stderr.pipe(process.stderr);
  proc.child.stdout.pipe(process.stdout);



  proc.status = 'started';
  console.log('started');
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
