# Seed.Coop - prototype

## Getting Started

seed bomb prototype

### Requirements

* Node v4.2.x and npm ([https://docs.npmjs.com/getting-started/installing-node](https://docs.npmjs.com/getting-started/installing-node))
* Bower ([http://bower.io/](http://bower.io/)), Brunch ([http://brunch.io/](http://brunch.io/)) and Nodemon ([https://github.com/remy/nodemon](https://github.com/remy/nodemon)) globally installed
```
$ npm install -g bower brunch nodemon
```
* MongoDB ([https://docs.mongodb.org/manual/installation/](https://docs.mongodb.org/manual/installation/))

### Main client side libraries
_These are automatically installed by bower, listed here for easy access_.

* Bootstrap SASS: [https://github.com/twbs/bootstrap-sass](https://github.com/twbs/bootstrap-sass)
* Jquery: [https://jquery.com/](https://jquery.com/)
* Jquery UI: [https://github.com/jquery/jquery-ui](https://github.com/jquery/jquery-ui)
* Character Counter: [https://github.com/kokulusilgi/Character-Counter-Plugin-for-jQuery](https://github.com/kokulusilgi/Character-Counter-Plugin-for-jQuery)
* File Uploader: [https://github.com/kartik-v/bootstrap-fileinput](https://github.com/kartik-v/bootstrap-fileinput)
* Form Validatior: [https://github.com/1000hz/bootstrap-validator](https://github.com/1000hz/bootstrap-validator)
* Address Picker: [https://github.com/sgruhier/typeahead-addresspicker](https://github.com/sgruhier/typeahead-addresspicker)
* WYSIWYG Editor: [https://github.com/summernote/summernote](https://github.com/summernote/summernote)

### Main server side libraries
_These are automatically installed by npm, listed here for easy access_.

* Mongoose: [http://mongoosejs.com/](http://mongoosejs.com/)
* Mongoose Crate: [https://github.com/achingbrain/mongoose-crate](https://github.com/achingbrain/mongoose-crate)
* KrakenJS: [http://krakenjs.com/](http://krakenjs.com/)
* Lodash: [https://lodash.com/](https://lodash.com/)
* BlueBird: [http://bluebirdjs.com/docs/getting-started.html](http://bluebirdjs.com/docs/getting-started.html)
* DustJS: [http://akdubya.github.io/dustjs/](http://akdubya.github.io/dustjs/)

### Installation
```
$ git clone git@github.com:colab-coop/seed-web-ui.git
$ cd seed-web-ui
$ git checkout develop
$ cp config/development-example.json config/development.json
$ cp dotenv-example .env
# edit .env as needed with db and payment gateway config 
$ npm install
$ bower install
```

### Development
#### Rebuilding the static assets
```
$ brunch build
```

#### Running the server with automatic static asset rebuild
```
$ source setenv.sh
$ brunch watch --server
# may also wish to copy and use the dev-start-example.sh
```

### Testing

TBD


### Deploying in production
```
$ export PORT=8108
$ forever stop 0
$ git pull
$ npm run brunch-build
$ forever start server.js
```
