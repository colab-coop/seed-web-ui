'use strict';


module.exports = function cachebreaker(grunt) {
  // Load task
  grunt.loadNpmTasks('grunt-cache-breaker');

  // Options
  return {
      dev: {
        options: {
          match: [
            {
              '/js/app.js': './static/js/app.js',
              '/css/app.css': './static/css/app.css',
            }],
          replacement: 'md5',
          position: 'append',
        },
        files: {
          src: ['.build/templates/layouts/master.js']
        }
      }
  };
};
