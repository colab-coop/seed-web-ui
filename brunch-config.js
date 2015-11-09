exports.config = {
    // See http://brunch.io/#documentation for docs.
    files: {
        javascripts: {
            joinTo: {
                'js/app.js': [
                    'public/js/*.js',
                    /^bower_components/
                ]
            },
            order: {
                before: [
                    'bower_components/jquery/dist/jquery.js',
                    'bower_components/jquery-ui/jquery-ui.js',
                    'bower_components/bootstrap-sass/assets/javascripts/bootstrap.js',
                    'bower_components/typeahead.js/dist/typeahead.bundle.js'
                ]
            }
        },
        stylesheets: {
            joinTo: {
                'css/app.css': ['public/css/*.scss',
                /^bower_components/]
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
            "public"
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
                '': ['public/images', 'public/fonts', 'public/favicon.ico', 'bower_components/bootstrap-fileinput/img/*.gif'],
                'fonts/bootstrap': ['bower_components/bootstrap-sass/assets/fonts/bootstrap/*'],
                'fonts': ['bower_components/font-awesome/fonts/*']
            }
        },
        browserSync: {
            files: ["public/**/*.dust"]
        }
    },

    server: {
        command: 'nodemon --watch controllers --watch models --watch config --watch lib server'
    }

};
