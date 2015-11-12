module.exports = function (shipit) {
  require('shipit-deploy')(shipit);
  var colors = require('colors');

  shipit.initConfig({
    default: {
      workspace: '/tmp/seedbomb',
      deployTo: '~/seedbomb',
      repositoryUrl: 'https://github.com/colab-coop/seed-web-ui.git',
      branch: 'develop',
      ignores: ['.git', 'node_modules'],
      keepReleases: 2,
      shallowClone: true,
      port: 8000,
      npm: 'npm',
      bower: 'bower',
      brunch: 'brunch',
      grunt: 'grunt',
      tmp: '/tmp',
      storage:'LocalFS',
      LocalFSFolder: 'u'
    },
    vagrant: {
      servers: 'deploy@127.0.0.1:2222'
    },
    staging: {
      servers: 'seedbombing@seedbombing.dev.colab.coop',
      deployTo: '~/seedbomb',
      branch: 'develop',
      port: 8108,
      brunch: '~/.nvm/versions/node/v4.2.1/bin/brunch',
      krakenConfig: 'config/config-staging.json',
      tmp: '~/seedbomb/tmp',
      storage:'S3',
    },
    production: {
      servers: 'seed@seed.colab.coop',
      deployTo: '/opt/www/seed/seed-web-ui',
      branch: 'develop',
      port: 8108,
      dotEnv: '.env.production',
      tmp: '~/seedbomb/tmp',
      npm: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/npm',
      bower: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/bower',
      brunch: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/brunch',
      grunt: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/grunt',
      storage:'S3',
    }
  });

  shipit.on('cleaned', function () {
    shipit.start('post-deploy');
  });

  shipit.task('post-deploy', function () {

    return shipit.remote('cd ' + shipit.config.deployTo + '/current &&  ' + shipit.config.npm + ' install')
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.bower + ' install')
      })
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.brunch + ' build');
      })
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.grunt + ' dustjs');
      })
      .then(function (res) { // create the shared folder
        return shipit.remote('mkdir -p ' + shipit.config.deployTo + '/shared');
      })
      .then(function (res) { // check if there already is a shared .env file
        return shipit.remote('test -e ' + shipit.config.deployTo + '/shared/.env && echo \"found\" || echo \"not found\"');
      })
      .then(function (res) { // copy the .env example if there is no .env file in the shared folder
        if (res[0].stdout.trim() === 'not found') {
          console.log(("[IMPORTANT] edit the " + shipit.config.deployTo + '/shared/.env file with the correct values before starting the server').red)
          return shipit.remoteCopy('dotenv-example', shipit.config.deployTo + '/shared/.env');
        } else {
          return Promise.resolve(true);
        }
      })
      .then(function (res) { // link the shared .env file in the current folder
        return shipit.remote('ln -sf ' + shipit.config.deployTo + '/shared/.env ' + shipit.config.deployTo + '/current/.env');
      })
      .then(function (res) { // set up the shared folder with an upload folder if necessary
        if (shipit.config.storage == 'LocalFS') {
          return shipit.remote('mkdir -p ' + shipit.config.deployTo + '/shared/' + shipit.config.LocalFSFolder)
            .then(function (res) {
              return shipit.remote('ln -fs ' + shipit.config.deployTo + '/shared/' + shipit.config.LocalFSFolder + '/ ' + shipit.config.deployTo + '/current/' + shipit.config.LocalFSFolder);
            })
        } else {
          return Promise.resolve(true);
        }
      })
      .then(function (res) {
        if (shipit.config.krakenConfig) {
          return shipit.remote('cp ' + shipit.config.deployTo + '/current/' + shipit.config.krakenConfig + ' ' + shipit.config.deployTo + '/current/config/config.json');
        } else {
          return Promise.resolve(true);
        }
      })
  });

  shipit.task('start', function () {
    return shipit.remote('cd ' + shipit.config.deployTo + '/current && TMP=' + shipit.config.tmp + ' NODE_ENV=production PORT=' + shipit.config.port + ' forever --append --uid \"seedbomb\" start server.js')
  });

  shipit.task('stop', function () {
    return shipit.remote('forever stop seedbomb')
  });

  shipit.task('status', function () {
    return shipit.remote('forever list')
  });

};
