# Seed.Coop - prototype

## Getting Started

seed bomb prototype

### Requirements

* Node v4.2.x and npm ([https://docs.npmjs.com/getting-started/installing-node](https://docs.npmjs.com/getting-started/installing-node))
* Bower ([http://bower.io/](http://bower.io/)), Brunch ([http://brunch.io/](http://brunch.io/)) and Nodemon ([https://github.com/remy/nodemon](https://github.com/remy/nodemon)) globally installed
```
$ npm install -g bower brunch nodemon shipit-cli
```
* MongoDB ([https://docs.mongodb.org/manual/installation/](https://docs.mongodb.org/manual/installation/))
* Redis ([http://redis.io/](http://redis.io/))

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
* Nodemailer [https://github.com/andris9/Nodemailer] (https://github.com/andris9/Nodemailer)

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
$ npm start
# may also wish to copy and use the dev-start-example.sh
```

### Data setup
important note for devs.  the latest code is using some data filters to control which campaigns are shown on the landing page
there are few steps needed to populate you data:

* you'll need to promote your logged user to be an admin.
* signup/login if needed  
* once logged in, you can hit this url:  http://localhost:8000/me/setAdmin
* note, there is a new config var:  admin_bootstrapKey=   which can be used to make this secure in production, but by default is open in dev (see the dotenv-example for more notes)
* once you're an admin, you'll see an 'ADMIN' link in the menu bar
* form the admin menu, you'll need to go to 'all proposal types' and choose 'new campaign'.  this is how campaigns are currently created in the system
* you'll want to make sure the type is set to 'campaign'.  and there are two special sub types to note:
* 'seedcoop' designates the special first campaign on the landing page, you'll also want to assign the 'view template' for this one to 'seedcoop'
* 'featured' designates the campaigns displayed lower down on the page.  (this can be a list)  you can also assign the 'loconomics' view template for one of those
* next is to create the membership offers:
* from the admin proposal list, choose 'admin view' for a campaign
* click 'create new offer'
* type needs to be 'membership'
* optionally enter a 'minimum contribution amount'.  note if present, then credit card info flow enabled when an option is chosen with an amount here
* it's good to create a free and paid membership offers per landing page campaign  (i.e. seedcoop and loconomics)

### Testing

TBD

### Vagrant environment
_Running the app in a vagrant VM is not necessary, this setting is here mainly to have an environment as close as production as possible._
#### Prerequisites
* VirtualBox ([https://www.virtualbox.org/wiki/Downloads](https://www.virtualbox.org/wiki/Downloads))
* Vagrant ([https://www.vagrantup.com/](https://www.vagrantup.com/))

#### Running
```
$ cd vagrant && vagrant up
```

### Deploying and running
We are using Shipit ([https://github.com/shipitjs/shipit](https://github.com/shipitjs/shipit)) for automatic deploys in the different environments.
Currently available environments are __staging__ and __vagrant__.

#### Deploying
```
$ shipit <environment> deploy
```
#### Rollback
```
$ shipit <environment> rollback
```

#### Starting the app
```
$ shipit <environment> start
```

#### Stoping the app
```
$ shipit <environment> stop
```

#### Getting the app status
```
$ shipit <environment> status
```
