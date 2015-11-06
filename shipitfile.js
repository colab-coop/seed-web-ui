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
      shallowClone: true
    },
    vagrant: {
      servers: 'deploy@vagrant:2222'
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
        return shipit.remote('cd ~/seedbomb/current && brunch build');
      })
      .then(function (res) {
        return shipit.remote('cd ~/seedbomb/current && grunt dustjs');
      })
      .then(function (res) {
        return shipit.remoteCopy('.env', '~/seedbomb/current');
      })

  });

  shipit.task('start', function () {
    return shipit.remote('cd ~/seedbomb/current && NODE_ENV=production forever start server.js')
  });

  shipit.task('stop', function () {
    return shipit.remote('cd ~/seedbomb/current && forever stop server.js')
  });

  shipit.task('status', function () {
    return shipit.remote('forever list')
  });

};
