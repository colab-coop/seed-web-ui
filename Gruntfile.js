'use strict';


module.exports = function (grunt) {

  // Load the project's grunt tasks from a directory
  require('grunt-config-dir')(grunt, {
    configDir: require('path').resolve('tasks')
  });

  require('dustjs-linkedin').config.whitespace = true;

  // Register group tasks
  //grunt.registerTask('build', ['jshint', 'dustjs', 'less', 'requirejs', 'copyto']);
  //note, the other js and css assets are built via 'brunch build' into 'static'
//  grunt.registerTask('build', ['dustjs']);  // this precompiles the templates
  grunt.registerTask('build', ['dustjs', 'cachebreaker']);

  //grunt.registerTask('test', ['jshint', 'mochacli']);
  grunt.registerTask('test', ['mochacli']);

};
