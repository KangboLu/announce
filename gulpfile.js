var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var htmlmin = require('gulp-htmlmin');
var cssmin = require('gulp-cssmin');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var replace = require('gulp-replace');
var clean = require('gulp-clean');
var path = require('path');
var gutil = require('gulp-util');
var autoprefixer = require('gulp-autoprefixer');
var webpack = require("gulp-webpack");
var watch = require("gulp-watch");
var pump = require('pump');
var webp = require('webpack');


var argv = require('yargs').argv;
var folder = "src";
var version = new Date().getTime();

var webpackConfig = {
  output: {
    filename: 'app.js'
  },
  module: {
    loaders: [{
      test: /\.html$/,
      loader: "mustache"
    }, {
      test: /\.scss$/,
      loader: "style!css!sass"
    }, {
      test: /\.json$/,
      loader: "json"
    }, {
      test: /\.css$/,
      loader: "style!css"
    }]
  },
  plugins: [
    new webp.optimize.DedupePlugin(),
    new webp.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    })
  ],
};

// inputs
var sassInput = [folder + '/**/*.scss', folder + "/**/*.css"];
var jsInput = [folder + "/app.js"];

// Paths
var folderDist = path.normalize('./dist/');
var distCSS = path.normalize(folderDist + '/style.css');
var distJS = path.normalize(folderDist + '/app.js');
var distIndex = path.normalize(folderDist + "/index.html");

//watchers
var distWatchers = [distCSS, distJS, distIndex];

function reportError(error) {
  gutil.log(gutil.colors.green(error.toString()));
  this.emit('end');
}

gulp.task('clean', function() {
  return gulp.src(folderDist, { read: false })
    .pipe(clean());
});

gulp.task('minifyCss', ['build', 'sass'], function() {
  return gulp.src(distCSS)
    .pipe(cssmin())
    .pipe(gulp.dest(folderDist));
});

gulp.task('uglifyJS', ['build', 'webpack'], function() {
  pump([
    gulp.src(distJS),
    uglify(),
    gulp.dest(folderDist)
  ]);
});

gulp.task('minifyHtml', ['build', 'copyIndex'], function() {
  return gulp.src(distIndex)
    .pipe(replace('{{VERSION}}', version))
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest(folderDist))
});



/// Watcher  STARTf

gulp.task('copyIndex', ['clean'], function() {
  return gulp.src([folder + '/index.html'])
    .pipe(replace('{{VERSION}}', version))
    .pipe(gulp.dest(folderDist));
});


gulp.task('copyAssets', ['clean'], function() {
  return gulp.src(folder + "/assets/**/*")
    .pipe(gulp.dest(folderDist + '/assets/'));
});

gulp.task('sass', ['clean'], function() {
  return gulp.src(sassInput)
    .pipe(sass().on('error', reportError))
    .pipe(sourcemaps.init())
    .pipe(autoprefixer())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.normalize(folderDist)))
});

gulp.task('webpack', ['clean'], function() {
  return gulp.src(jsInput)
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest(folderDist));
});

gulp.task('sassWatcher', ['build'], function() {
  return watch(sassInput, function(){
    gutil.log(gutil.colors.green('Sass Changed'));
    return gulp.src(sassInput)
      .pipe(sass().on('error', reportError))
      .pipe(sourcemaps.init())
      .pipe(autoprefixer())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(path.normalize(folderDist)))
  });
});

gulp.task('webpackWatcher', ['build'], function() {
  gutil.log(gutil.colors.green('Watching JS Files in ' + folder));
  var config = webpackConfig;
  config.watch = true;

  gulp.src(jsInput)
    .pipe(webpack(config))
    .pipe(gulp.dest(folderDist));
});

gulp.task('distWatcher', ['build', 'copyIndex', 'copyAssets'], function() {
  gutil.log(gutil.colors.green('Watching Files in ' + folder));


  gulp.watch(distWatchers, function(event) {
    

    // Hacked in css hotreload *FIX ME  / DONT HATE ME FURQAN - viktor
    if (event.path.indexOf('style.css') !== -1){
      gutil.log(gutil.colors.green('css relaod ?'));      
      gulp.src( path.normalize(event.path))
      .pipe(browserSync.stream());
      return
    };

    gutil.log(gutil.colors.green('Dist File Changed', JSON.stringify(event)));
    browserSync.reload(folderDist + "/index.html");
  });
});

gulp.task('browserSync', ['build'], function() {

  browserSync.init({
    open: false,
    ghostMode: false,
    server: {
      baseDir:"./dist/"
    },
  });
});

gulp.task('develop', ['build', 'browserSync', 'sassWatcher',  'webpackWatcher', 'distWatcher']);
gulp.task('build', ['copyIndex', 'webpack', 'sass', 'copyAssets']);
gulp.task('package', ['clean', 'build', 'minifyCss', 'uglifyJS', 'minifyHtml']);
