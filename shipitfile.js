module.exports = function (shipit) {
  require('shipit-deploy')(shipit);
  var colors = require('colors');

  function getEnv(key, defaultValue) {
    var value = process.env[key];
    return value        ? value :
           defaultValue ? defaultValue :
           console.log((key + " environment variable required" ).red ) & process.exit(1);
  }

  shipit.initConfig({
    default: {
      workspace: '/tmp/seedbomb',
      deployTo: '~/seedbomb',
      repositoryUrl: 'https://github.com/colab-coop/seed-web-ui.git',
      branch: getEnv('SEED_BRANCH', 'develop'),
      ignores: ['.git', 'node_modules'],
      keepReleases: 2,
      shallowClone: true,
      port: 8000,
      npm: 'npm',
      bower: 'bower',
      brunch: 'brunch',
      grunt: 'grunt',
      tmp: '/tmp',
      storage: 'LocalFS', // TODO: this value is duplicated in the .env file, this script should get it from there
      LocalFSFolder: 'u', // TODO: this value is duplicated in the .env file, this script should get it from there
    },
    vagrant: {
      servers: 'deploy@127.0.0.1:2222'
    },
    old_staging: {
      servers: 'seedbombing@seedbombing.dev.colab.coop',
      deployTo: '~/seedbomb',
      port: 8108,
      brunch: '~/.nvm/versions/node/v4.2.1/bin/brunch',
      krakenConfig: 'config/config-staging.json',
      tmp: '~/seedbomb/tmp'
    },
    staging: {
      servers: 'seed@seed.stage.colab.coop',
      deployTo: '~/seed-web-ui',
      port: 8108,
      brunch: '~/.nvm/versions/node/v4.2.1/bin/brunch',
      tmp: '~/tmp'
    },
    production: {
      servers: 'seed@seed.colab.coop',
      deployTo: '/opt/www/seed/seed-web-ui',
      branch: getEnv('SEED_BRANCH'),
      port: 8108,
      tmp: '/opt/www/seed/tmp',
      npm: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/npm',
      bower: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/bower',
      brunch: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/brunch',
      grunt: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/grunt'
    }
  });

  shipit.on('cleaned', function () {
    shipit.start('post-deploy');
  });

  shipit.task('post-deploy', function () {
    var currentFolder = shipit.config.deployTo + '/current/';
    var sharedFolder = shipit.config.deployTo + '/shared/';

    return runInFolder(currentFolder, shipit.config.npm + ' install')
      .then(function (res) {
        return runInFolder(currentFolder, shipit.config.bower + ' install')
      })
      .then(function (res) {
        return runInFolder(currentFolder, shipit.config.brunch + ' build');
      })
      .then(function (res) {
        return runInFolder(currentFolder, shipit.config.grunt + ' build');
      })
      .then(function (res) { // create the shared folder
        return shipit.remote('mkdir -p ' + sharedFolder);
      })
      .then(function (res) { // check if there already is a shared .env file
        return shipit.remote('test -e ' + sharedFolder + '.env && echo \"found\" || echo \"not found\"');
      })
      .then(function (res) { // copy the .env example if there is no .env file in the shared folder
        if (res[0].stdout.trim() === 'not found') {
          console.log(("[IMPORTANT] edit the " + sharedFolder + '.env file with the correct values before starting the server').red)
          return shipit.remoteCopy('dotenv-example', sharedFolder + '.env');
        } else {
          return next();
        }
      })
      .then(function (res) { // link the shared .env file in the current folder
        return shipit.remote('ln -sf ' + sharedFolder + '.env ' + currentFolder + '.env');
      })
      .then(function (res) { // set up the shared folder with an upload folder if necessary
        if (shipit.config.storage == 'LocalFS') {
          return shipit.remote('mkdir -p ' + sharedFolder + shipit.config.LocalFSFolder)
            .then(function (res) {
              return shipit.remote('ln -fs ' + sharedFolder + shipit.config.LocalFSFolder + '/ ' + currentFolder + shipit.config.LocalFSFolder);
            })
        } else {
          return next;
        }
      })
      .then(function (res) {
        if (shipit.config.krakenConfig) {
          return shipit.remote('cp ' + currentFolder + shipit.config.krakenConfig + ' ' + currentFolder + 'config/config.json');
        } else {
          return next;
        }
      })
  });

  shipit.task('start', function () {
    return start()
  });

  shipit.task('stop', function () {
    return stop()
  });

  shipit.task('restart', function () {
    return isRunning().then(function (isRunning) {
      return isRunning
        ? stop().then(function (res) {
        return start()
      })
        : start()
    })
  });

  shipit.task('status', function () {
    return status()
  });

  /*
   * Helpers
   */

  function runInFolder(folder, command) {
    return shipit.remote('cd ' + folder + ' && ' + command)
  }

  function stop() {
    return shipit.remote('forever stop seedbomb');
  }

  function start() {
    return shipit.remote('cd ' + shipit.config.deployTo + '/current && TMP=' + shipit.config.tmp + ' NODE_ENV=production PORT=' + shipit.config.port + ' forever --append --uid \"seedbomb\" start server.js');
  }

  function status() {
    return shipit.remote('forever list');
  }

  function isRunning() {
    return status().then(function (rawStatus) {
      return Promise.resolve(rawStatus[0].stdout.match(/seedbomb/) != null)
    })
  }

  function next() {
    return Promise.resolve(true);
  }

};
