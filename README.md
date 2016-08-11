# Process Babysitter

The babysitter is meant to alleviate the tedium of starting & managing multiple processes when developing distributed applications. This manager is meant to be used **FOR DEVELOPMENT ONLY**. Please use something better for production such [systemd](https://en.wikipedia.org/wiki/Systemd), [upstart](https://en.wikipedia.org/wiki/Upstart), [forever](https://github.com/foreverjs/forever),
[pm2](https://github.com/Unitech/pm2), etc.

```
npm install -g process-babysitter
mkdir config
touch config/default.json
# set up config files
process-babysitter ./config
open http://localhost:9876/   # port is configurable, see below
```


# Configuration

The babysitter uses [Node Config](https://github.com/lorenwest/node-config) ([docs](https://github.com/lorenwest/node-config/wiki/Configuration-Files)) to manage configuration files. This allows multiple configurations to reside in the same directory & extend the base config for various environments & deployments. Some fields can be [Lodash templates](https://lodash.com/docs#template) as noted below.

The configuration should contain:

* `server`: Server settings
    * `port`: Port to bind to for HTTP & Socket.io access.
* `template_vars`: Dictionary of variables to make available to process field templates.
* `processes`: Dictionary of processes to babysit. Each processes key should be the same as its id field.
    * `id`: Process id. Used as id in HTTP routes.
    * `enabled`: Boolean whether the process should be ignored.
    * `name`: Human name for process. Displayed in web UI.
    * `command`: Templated command to run.
    * `cwd`: Templated value for the subprocess working directory.
    * `args`: Array of templated arguments for the subprocess (everything that follows the command).

Example `default.json`:

```javascript
{
  "server": {
    "port": 9876
  },
  "template_vars": {
    "services_dir": "/Users/me/dev/my-stuff/"
  },
  "processes": {
    "api": {
      "id": "api",
      "enabled": true,
      "name": "API Service",
      "command": "node",
      "cwd": "<%= services_dir %>my-api",
      "args": ["<%= services_dir %>my-api/index.js"]
    },
    "mongodb": {
      "id": "mongodb",
      "enabled": true,
      "name": "MongoDB Server",
      "command": "mongod"
    }
  }
}
```

It should be noted that child processes will inherit the environment variables set when the babysitter is started. Setting variables per process is not yet supported but planned in the near future.

Use the standard [node-config variables](https://github.com/lorenwest/node-config/wiki/Environment-Variables) (`NODE_ENV`, `NODE_APP_INSTANCE`, etc) to change which config files are loaded. The babysitter will pass on any `process.env` variables except the following so as to not interfere with child processes.

* `NODE_CONFIG_DIR`
* `NODE_ENV`
* `NODE_APP_INSTANCE`

In this manner it is possible to have many project configurations in the same directory (if desired).


# Web UI

The web UI is meant to give an easy interface to start, stop & view process output. Each registered process is listed as a collapsable section and can be started/stopped individually or all at once. The UI interacts with the server via the REST API & Socket.io events. See the source (it's quite small) for the HTTP routes & socket.io events.

The UI itself should be fairly self-explanatory with stdout on the left & stderr on the right. The "pause" button will pause stdout/stderr for all processes (in the UI, the server still collects it) until clicked again. The "clear" button will remove all logs for all processes in the UI & server. Both the UI & server keep the last ~100 lines (may be configurable in the future) of output.

```
open http://localhost:9876/
```
