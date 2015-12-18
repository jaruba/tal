/* jshint node: true */
module.exports = function (grunt) {
    "use strict";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            files: ['static/script/**/*.js'],
            options: {
                jshintrc: '.jshintrc',
                ignores: [
                    'static/script/lib/*',
                    'static/script/devices/googletv.js',
                    'static/script/devices/data/json2.js',
                    'static/script/widgets/horizontalcarousel.js'
                ]
            }
        },
        jasmine: {
            src: 'static/script/**/*.js',
            options: {
                specs: ['static/script-tests/tests/**/*.js'],
                vendor: [
                    "static/script-tests/lib/sinon.js",
                    "static/script-tests/lib/ondevicetestconfigvalidate.js",
                    "static/script-tests/lib/require.js",
                    "static/script-tests/jasmine/jstestdriver-adapter.js",
                    "static/script-tests/lib/mockapplication.js",
                    "static/script-tests/lib/phantompolyfills.js",
                    "static/script-tests/mocks/mockelement.js",
                    "static/script-tests/tests/devices/mediaplayer/commontests.js",
                    "static/script-tests/tests/devices/mediaplayer/html5commontests.js",
                    "static/script-tests/tests/devices/mediaplayer/cehtmlcommontests.js"
                ],
                styles: [
                    "static/script-tests/lib/carousels.css",
                    "static/script-tests/lib/css3transitions.css"
                ],
                template: "static/script-tests/jasmine/SpecRunner.html",
                outfile: 'static/script-tests/jasmine/WebRunner.html',
                keepRunner: true,
                display: "full",
                templateOptions: {
                    scriptRoot: "../..",
                    frameworkVersion: "2.1.0"
                }
            }
        },
        watch: {
            jshint: {
                files: ["static/script/**/*.js"],
                tasks: ["jshint"]
            }
        },
        complexity: {
            generic: {
                src: ['static/script/**/*.js'],
                exclude: ['static/script/targets/core.js'],
                expand: true,
                options: {
                    breakOnErrors: false,
                    jsLintXML: 'report.xml',         // create XML JSLint-like report
                    checkstyleXML: 'checkstyle.xml', // create checkstyle report
                    errorsOnly: false,               // show only maintainability errors
                    cyclomatic: [3, 7, 12],          // or optionally a single value, like 3
                    halstead: [8, 13, 20],           // [difficulty, volume, effort] or optionally a single value, like 8
                    maintainability: 100,
                    hideComplexFunctions: false,     // only display maintainability
                    broadcast: false                 // broadcast data over event-bus
                }
            }
        },
        replace: {
            'jsdoc-tidy': {
                src: ['jsdoc/**/*.html'],
                overwrite: true,
                replacements: [{
                    from: '../symbols/',
                    to: ''
                },
                {
                    from: "</body>",
                    to: grunt.file.read('jsdoc/footer.txt').trim() + "</body>"
                }]
            }
        },
        bump: {
          options: {
            files: ['package.json', 'bower.json'],
            updateConfigs: [],
            commit: true,
            commitMessage: 'Release v%VERSION%',
            commitFiles: ['package.json', 'bower.json'],
            createTag: true,
            tagName: '%VERSION%',
            tagMessage: 'Version %VERSION%',
            push: true,
            pushTo: 'origin',
            gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
            globalReplace: false,
            prereleaseName: false,
            regExp: false
          }
        },
        shell: {
            coverage: {
                command: 'cd static/script-tests/jasmine; pwd; ./coverage.sh -p;'
            }
        }
    });

    grunt.registerTask('generate-jsdoc', 'Generate JsDoc for TAL', function() {
        var path = require('path');
        var execSync = require('exec-sync');

        if (grunt.file.exists('jsdoc/symbols')) {
            grunt.file.delete('jsdoc/symbols');
        }
        grunt.file.recurse('static/script', function(absPath, rootDir, subDir, fileName) {
            subDir = subDir || '';
            grunt.file.copy(absPath, path.join('antie', 'static', 'script', subDir, fileName));
        });

        execSync('node_modules/jsdoc-toolkit/app/run.js -r=10 -t=node_modules/jsdoc-toolkit/templates/jsdoc -d=jsdoc antie/static/script');
        grunt.file.delete('antie');
    });

    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-complexity');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks('grunt-bump');


    grunt.registerTask("hint", ["jshint"]);
    grunt.registerTask("test", ["jasmine"]);

    grunt.registerTask('jsdoc', ['generate-jsdoc', 'replace:jsdoc-tidy']);
    grunt.registerTask("full", ["jshint", "jasmine"]);
    grunt.registerTask('default', 'full');
    grunt.registerTask("coverage", "Produce a coverage report of the main source files", ["jasmine:src:build", "shell:coverage"]);
    grunt.registerTask("spec", ["jasmine:src:build", "openspec"]);

    grunt.registerTask("openspec", "Open the generated Jasmine spec file", function() {
        var childProcess = require('child_process');
        var outfile = grunt.config("jasmine.options.outfile");
        grunt.log.writeln('Opening ' + outfile + '...');
        childProcess.exec("open " + outfile);
    });
    grunt.registerTask('update-contributors', "Update contributors", function() {
        var done = this.async();
        var getTopContribs = require('top-gh-contribs');
        var oauthKey = process.env.GITHUB_OAUTH_KEY;
        var packageJsonFileName = './package.json';
        var packageJsonFile = require(packageJsonFileName);
        var bowerJsonFileName = './bower.json';
        var bowerJsonFile = require(bowerJsonFileName);

        grunt.log.writeln('Downloading release and contributor information from GitHub...');

        return getTopContribs({
                user: 'fmtvp',
                repo: 'tal',
                oauthKey: oauthKey,
                retry: true
            })
            .then(function (contributors) {
                var contributorsString = '',
                    contributorsArray = [];

                contributors.forEach(function(c) {
                    contributorsString += c.name + " (" + c.githubUrl + ")\n";
                });

                contributorsArray = contributorsString.trim().split("\n");

                // write to authors.md
                grunt.file.write('AUTHORS', contributorsString);

                // write to package.json
                packageJsonFile.contributors = contributorsArray;
                grunt.file.write(packageJsonFileName, JSON.stringify(packageJsonFile, null, 2));

                //write to bower.json
                bowerJsonFile.authors = contributorsArray;
                grunt.file.write(bowerJsonFileName, JSON.stringify(bowerJsonFile, null, 2));

            })
            .then(done).catch(function (err) {
                if (err.http_status) {
                grunt.log.writeln('\nGitHub API request returned status: ' + err.http_status);
            }

            if (err.ratelimit_limit) {
                grunt.log.writeln('\nRate limit data: limit: %d, remaining: %d, reset: %s', err.ratelimit_limit, err.ratelimit_remaining, err.ratelimit_reset);
            }
            done(false);
        });
    });
};
