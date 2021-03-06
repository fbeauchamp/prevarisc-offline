'use strict';
var LIVERELOAD_PORT = 35729;
var SERVER_PORT = 3000;
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'
// templateFramework: 'mustache'

module.exports = function (grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    // configurable paths
    var yeomanConfig = {
        app: 'app',
        dist: 'dist'
    };

    grunt.initConfig({
        yeoman: yeomanConfig,
        watch: {
            options: {
                nospawn: true,
                livereload: true
            },
            livereload: {
                options: {
                    livereload: grunt.option('livereloadport') || LIVERELOAD_PORT
                },
                files: [
                    '<%= yeoman.app %>/*.html',
                    '{.tmp,<%= yeoman.app %>}/styles/{,*/}*.css',
                    '{.tmp,<%= yeoman.app %>}/scripts/{,*/}*.js',
                    '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp}',
                    '<%= yeoman.app %>/scripts/templates/*.{ejs,mustache,hbs}',
                    'test/spec/**/*.js'
                ]
            },
            mustache: {
                files: [
                    '<%= yeoman.app %>/scripts/templates/*.mustache'
                ],
                tasks: ['mustache']
            },
            test: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.js', 'test/spec/**/*.js'],
                tasks: ['test:true']
            }
        },
        connect: {
            options: {
                port: grunt.option('port') || SERVER_PORT,
                // change this to '0.0.0.0' to access the server from outside
                hostname: '0.0.0.0'
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, yeomanConfig.app)
                        ];
                    }
                }
            },
            test: {
                options: {
                    port: 9001,
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, 'test'),
                            mountFolder(connect, yeomanConfig.app)
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, yeomanConfig.dist)
                        ];
                    }
                }
            }
        },
        open: {
            server: {
                path: 'http://localhost:<%= connect.options.port %>'
            },
            test: {
                path: 'http://localhost:<%= connect.test.options.port %>'
            }
        },
        clean: {
            dist: ['.tmp', '<%= yeoman.dist %>/*'],
            server: '.tmp'
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= yeoman.app %>/scripts/{,*/}*.js',
                '!<%= yeoman.app %>/scripts/vendor/*',
                'test/spec/{,*/}*.js'
            ]
        },
        mocha: {
            all: {
                options: {
                    run: true,
                    src: ['http://localhost:<%= connect.test.options.port %>/index.html']
                }
            }
        },
        requirejs: {
            dist: {

                // Options: https://github.com/jrburke/r.js/blob/master/build/example.build.js
                options: {
                    baseUrl: '<%= yeoman.app %>/scripts',
                    optimize: 'uglify2',//uglify2',/*25/06/2014 : gives an error on IOS*/
                    // TODO: Figure out how to make sourcemaps work with grunt-usemin
                    // https://github.com/yeoman/grunt-usemin/issues/30
                    //generateSourceMaps: true,
                    // required to support SourceMaps
                    // http://requirejs.org/docs/errors.html#sourcemapcomments
                    preserveLicenseComments: true,
                    useStrict: true,
                    wrap: false, /**/
                    uglify2: {
                        mangle: true,
                        sourceMap: true,
                        sourceMapName :'<%= yeoman.distclient %>/scripts/main.js.map'} // https://github.com/mishoo/UglifyJS2
                }
            }
        },
        useminPrepare: {
            html: '<%= yeoman.app %>/index.html',
            options: {
                dest: '<%= yeoman.dist %>'
            }
        },
        usemin: {
            html: ['<%= yeoman.dist %>/{,*/}*.html'],
            css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
            options: {
                dirs: ['<%= yeoman.dist %>']
            }
        },
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.{png,jpg,jpeg}',
                    dest: '<%= yeoman.dist %>/images'
                }]
            }
        },

        cssmin: {
            dist: {
                files: {
                    '<%= yeoman.dist %>/styles/main.css': [
                        //'.tmp/styles/{,*/}*.css',
                        //'<%= yeoman.app %>/styles/{,*/}*.css'
                        '<%= yeoman.app %>/bower_components/bootstrap/dist/css/bootstrap.css',
                        '<%= yeoman.app %>/bower_components/fontawesome/css/font-awesome.css',
                        '<%= yeoman.app %>/bower_components/datatables/media/css/jquery.dataTables.min.css',
                        '<%= yeoman.app %>/styles/main.css'
                    ]
                }
            }
        },/*
        cssmin: {
            dist: {
                files: {
                    '<%= yeoman.dist %>/styles/main.css': [
                        '.tmp/styles/{,* /}*.css',
                        '<%= yeoman.app %>/styles/{,* /}*.css'
                    ]
                }
            }
        },*/
        htmlmin: {
            dist: {
                options: {
                    /*removeCommentsFromCDATA: true,
                    // https://github.com/yeoman/grunt-usemin/issues/44
                    //collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    removeAttributeQuotes: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeOptionalTags: true*/
                },
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>',
                    src: '*.html',
                    dest: '<%= yeoman.dist %>'
                }]
            }
        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '<%= yeoman.dist %>',
                    src: [
                        '*.{ico,txt}',
                        '.htaccess',
                        'manifest.json',
                        'images/**/*.{webp,gif}',
                        'fonts/*'
                    ]
                }]
            },/*
            cordova: {
                files: [
                    {
                        expand:true,
                        flatten:true,
                        dot: true,
                        cwd: '<%= yeoman.app %>',
                        dest: '<%= yeoman.dist %>/scripts/lib/cordova',
                        src: [

                            'scripts/lib/cordova/*'


                        ]
                    }
                ]
            },*/
            fontawesome: {
                files: [
                    {
                        expand:true,
                        flatten:true,
                        dot: true,
                        cwd: '<%= yeoman.app %>',
                        dest: '<%= yeoman.dist %>/fonts',
                        src: [

                            'bower_components/fontawesome/fonts/*'


                        ]
                    }
                ]
            }/*,
            awesomemarker: {
                files: [
                    {
                        expand:true,
                        flatten:true,
                        dot: true,
                        cwd: '<%= yeoman.app %>',
                        dest: '<%= yeoman.dist %>/styles/images',
                        src: [
                            'bower_components/Leaflet.awesome-markers/dist/images/*.png'


                        ]
                    }
                ]
            }*/
        },
        bower: {
            all: {
                rjsConfig: '<%= yeoman.app %>/scripts/main.js'
            }
        },
        mustache: {
            files: {
                src: '<%= yeoman.app %>/scripts/templates/',
                dest: '.tmp/scripts/templates.js',
                options: {
                    prefix: 'define(function() { this.JST = ',
                    postfix: '; return this.JST;});'
                }
            }
        },
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= yeoman.dist %>/scripts/{,*/}*.js',
                        '<%= yeoman.dist %>/styles/{,*/}*.css',
                        '<%= yeoman.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp}',
                        '/styles/fonts/{,*/}*.*',
                    ]
                }
            }
        },
        autoprefixer: {
            options: {
                cascade: false
            },
            dist:{

                src: '<%= yeoman.dist %>/{,*/}*.css'
            }
        },
        manifest: {
            generate: {
                options: {
                    basePath: "<%= yeoman.dist %>/",
                    //cache:["js/app.js", "css/style.css"],
                    network: ["*"],
                    //fallback:["/node/wms images/wms-offline.png"],
                    exclude: ["index.html"],
                    preferOnline: true,
                    verbose: true,
                    timestamp: true
                },
                src: [
                    "*.html",
                    "*.png",
                    "*.ico",
                    "scripts/*.js",
                    "bower_components/requirejs/require.js",
                    "styles/*.css",
                    "images/*.png",
                    'manifest.json',
                    //"images/leaflet/*.png",
                    'fonts/*.woff'
                   // 'fonts/*.ttf'
                ],
                dest: "<%= yeoman.dist %>/manifest.appcache"
            }
        }
    });

    grunt.registerTask('createDefaultTemplate', function () {
        grunt.file.write('.tmp/scripts/templates.js', 'this.JST = this.JST || {};');
    });

    grunt.registerTask('server', function (target) {
        grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
        grunt.task.run(['serve' + (target ? ':' + target : '')]);
    });

    grunt.registerTask('serve', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'open:server', 'connect:dist:keepalive']);
        }

        if (target === 'test') {
            return grunt.task.run([
                'clean:server',
                'createDefaultTemplate',
                'mustache',
                'connect:test',
                'open:test',
                'watch'
            ]);
        }

        grunt.task.run([
            'clean:server',
            'createDefaultTemplate',
            'mustache',
            'connect:livereload',
            'open:server',
            'watch'
        ]);
    });

    grunt.registerTask('test', function (isConnected) {
        isConnected = Boolean(isConnected);
        var testTasks = [
                'clean:server',
                //'createDefaultTemplate',
                'mustache',
                'connect:test',
                'mocha',
            ];

        if(!isConnected) {
            return grunt.task.run(testTasks);
        } else {
            // already connected so not going to connect again, remove the connect:test task
            testTasks.splice(testTasks.indexOf('connect:test'), 1);
            return grunt.task.run(testTasks);
        }
    });

    grunt.registerTask('build', [
        'clean:dist',
        //'createDefaultTemplate',
        //'mustache', handled by requirejs
        'useminPrepare',
        'requirejs',
        'imagemin',
        'htmlmin',
        'concat',
        'cssmin',
        'uglify',
        'copy',
        'copy:fontawesome',
        //'rev',
        'autoprefixer',
        'usemin',
        'manifest'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test',
        'build'
    ]);
};
