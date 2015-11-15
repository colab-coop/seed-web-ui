'use strict';


module.exports = function (grunt) {

  // Load the project's grunt tasks from a directory
  require('grunt-config-dir')(grunt, {
    configDir: require('path').resolve('tasks')
  });

  grunt.registerTask('build', ['dustjs', 'cachebreaker']);
};
