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
      npm: 'npm',
      bower: 'bower',
      brunch: 'brunch',
      grunt: 'grunt',
      dotEnv: '.env',
      tmp: '/tmp'
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
      tmp: '~/seedbomb/tmp'
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
      grunt: '/opt/www/seed/.nvm/versions/node/v4.2.1/bin/grunt'
    }
  });

  shipit.on('cleaned', function () {
    shipit.start('post-deploy');
  });

  shipit.task('post-deploy', function () {

    return shipit.remote('cd ' + shipit.config.deployTo + '/current &&  '+ shipit.config.npm + ' install')
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.bower + ' install')
      })
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.brunch + ' build');
      })
      .then(function (res) {
        return shipit.remote('cd ' + shipit.config.deployTo + '/current && ' + shipit.config.grunt + ' dustjs');
      })
      .then(function (res) {
        return shipit.remoteCopy(shipit.config.dotEnv, shipit.config.deployTo + '/current/.env');
      })
      .then(function (res) {
        return shipit.remote('mkdir -p ' + shipit.config.deployTo + '/shared/u');
      })
      .then(function (res) {
        return shipit.remote('ln -s ' + shipit.config.deployTo + '/shared/u/ ' +  shipit.config.deployTo + '/current/u');
      })
      .then(function (res) {
        if (shipit.config.krakenConfig) {
          return shipit.remote('cd ' + shipit.config.deployTo + '/current/' + shipit.config.krakenConfig + ' ' + shipit.config.deployTo + '/current/config/config.json');
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
