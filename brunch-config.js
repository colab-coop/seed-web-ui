exports.config = {
  // See http://brunch.io/#documentation for docs.
  files: {
    javascripts: {
      joinTo: {
        'js/app.js': [
          'public/js/*.js',
          /^bower_component/
        ]
      }
    },
    stylesheets: {
      joinTo: {
        'css/app.css': 'public/css/*.scss'
      }
    }

  },
  conventions: {
    // This option sets where we should place non-css and non-js assets in.
    // By default, we set this to "/web/static/assets". Files in this directory
    // will be copied to `paths.public`, which is "priv/static" by default.
    assets: [
      /^(app\/assets)/
    ]
  },

  paths: {
    watched: [
      "public",
    ],
    // Where to compile files to
    public: "static"
  },

  modules: {
    autoRequire: {
      "js/app.js": ["public/js/app"]
    }

  },
  // Configure your plugins
  plugins: {
    babel: {},
    assetsmanager: {
      copyTo: {
        '': ['public/images', 'public/fonts', 'public/favicon.ico'],
        'fonts': ['bower_components/bootstrap-sass/assets/fonts/bootstrap/*']
      }
    },    
    browserSync: {
      files: ["public/**/*.dust"]
    }
  },

  server: {
    path: 'brunch-server.js',
    port: 8000
  }

};
