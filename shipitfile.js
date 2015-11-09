module.exports = function (shipit) {
  require('shipit-deploy')(shipit);

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
      brunch: 'brunch',
      dotEnv: '.env'
    },
    vagrant: {
      servers: 'deploy@vagrant:2222'
    },
    staging: {
      servers: 'seedbombing@seedbombing.dev.colab.coop',
      deployTo: '~/seedbomb',
      branch: 'develop',
      port: 8108,
      brunch: '~/.nvm/versions/node/v4.2.1/bin/brunch',
      krakenConfig: 'config/config-staging.json'
    },
    production: {
      branch: 'master'
    }
  });

  shipit.on('cleaned', function () {
    shipit.start('post-deploy');
  });

  shipit.task('post-deploy', function () {

    return shipit.remote('cd ~/seedbomb/current && npm install')
      .then(function (res) {
        return shipit.remote('cd ~/seedbomb/current && bower install')
      })
      .then(function (res) {
        return shipit.remote('cd ~/seedbomb/current && ' + shipit.config.brunch + ' build');
      })
      .then(function (res) {
        return shipit.remote('cd ~/seedbomb/current && grunt dustjs');
      })
      .then(function (res) {
        return shipit.remoteCopy(shipit.config.dotEnv, '~/seedbomb/current');
      })
      .then(function (res) {
        return shipit.remote('ln -s ~/seedbomb/shared/u/ ~/seedbomb/current/u');
      })
      .then(function (res) {
        if (shipit.config.krakenConfig) {
          return shipit.remote('cp ~/seedbomb/current/' + shipit.config.krakenConfig + ' ~/seedbomb/current/config/config.json');
        } else {
          return Promise.resolve(true);
        }
      })

  });

  shipit.task('start', function () {
    return shipit.remote('cd ~/seedbomb/current && NODE_ENV=production PORT=' + shipit.config.port + ' forever --append --uid \"seedbomb\" start server.js')
  });

  shipit.task('stop', function () {
    return shipit.remote('forever stop seedbomb')
  });

  shipit.task('status', function () {
    return shipit.remote('forever list')
  });

};
