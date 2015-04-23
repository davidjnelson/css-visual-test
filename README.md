Css Visual Test
===============

Overall Goal
------------

How do we know that if css changes for all the components comprising an application, that the application looks as expected for every state mutation the application supports?

Usage
-----

`make componentlibrary`

This will run a build, then generate the component library and a server to view it on port 4000 to be used for visual testing, manual inspection to understand the codebase, and/or debugging creation of visual tests. Running node css-visual-test/component-library-server.js will regenerate the component library if needed as well if you change something.

`make visualtest`

This will run all the visual tests using Applitools Eyes for image comparison, and Sauce Labs for browser automation. If differences are noted between runs or new visual tests are added, a failed test is reported.  When tests fail, make returns an Error 1 code, which will fail the build.  This will run the componentlibrary task along with the component library server if it's not already running before it runs.

You'll need to create an account at both Sauce Labs and Applitools to use this tool.  They both have free trials.

[Sauce Labs Signup Page](http://saucelabs.com/signup)

[Applitools Signup Page](https://applitools.com/sign-up)

From the Applitools UI you can approve a new test as a baseline, or see any screenshots marked as failures.  You can also change the algorithm used for image comparison, mark areas of the viewport to ignore from the screenshot, and apply changes to the configuration in batches.

Open Files Limit
----------------

It is recommended to increase your open files limit before running massively parallelized tests.  Do this with this command: `ulimit -n 8192`

Creating New Visual Tests
-------------------------

To create new visual tests, create a `visualtests` directory as a subdirectory under any directory that is a child of the `client` directory.  Create any number of files you want with the format `<direction>-<testDataNumber>.jsx` where `direction` is either `ltr` for right to left languages, `rtl` for right to left languages, and `testDataNumber` is any number from 1 to n which represents a variation of the component's data that you would like to test.

For example, if you look at the client/card directory, you can see a subdirectory called visualtests there.  You can see four files:

- ltr-1.jsx is an instantiation of the card component with a single word "test" in left to right direction. 
- ltr-2.jsx is an instantiation of the card component with a roughly fifty repetitions of the word "test" in left to right 
direction. 
- rtl-1.jsx is an instantiation of the card component with a single word "test" in right to left direction. 
- rtl-2.jsx is an instantiation of the card component with a roughly fifty repetitions of the word "test" in right to left 
direction.

Here is an image which shows this:

![Visual Tests Directory Structure](https://cloud.githubusercontent.com/assets/381633/7289360/c9d8ac5e-e923-11e4-9101-e8fea1e5c45c.png)

The test runner will automatically pick up files if you follow this format.  There is no need to create a separate manifest file listing tests.  Also, you can write the component bootstrap files ( ie: ltr-1.jsx ) just like you would in the real application.  

The jsx will be transpiled, the requires will be resolved.  The css is from the output of the scss being compiled via make build.  The template to host the components in the component library uses a jade template.

Configuring Secret Keys
-----------------------

Add a file to `css-visual-test/lib` called `PrivateConfig.js`, as in `css-visual-test/lib/PrivateConfig.js`.

Copy and paste the following and fill in your Sauce Labs username and access key, and your Applitools access key:

    module.exports = {
        sauceLabsUsername: '',
        sauceLabsAccessKey: '',
        applitoolsEyesAccessKey: ''
    };


Running Visual Tests That Pass
------------------------------

`make visualtest` output:

![Make visualtest output](https://cloud.githubusercontent.com/assets/381633/7289373/1489c706-e924-11e4-89d2-ae825a4a79eb.png)

Sauce Labs selenium grid runner status UI output:

![Sauce Labs selenium grid runner status UI output](https://cloud.githubusercontent.com/assets/381633/7289394/46e2b168-e924-11e4-9b17-5b4bd31bbcc9.png)

A single passing test for one environment in the Applitools Eyes test runner status UI:

![A single passing test for one environment in the Applitools Eyes test runner status UI](https://cloud.githubusercontent.com/assets/381633/7289693/739ff798-e928-11e4-9a17-497cf4643c95.png)

Running visual tests that fail
-------------------------------------

After changing the `public/style.css` from:

    @media only screen and (min-width: 480px) {
        .card {
            margin-bottom: 16px;
            padding: 24px; } }

to:

    @media only screen and (min-width: 480px) {
        .card {
            margin-bottom: 16px;
            padding: 240px; } }

`make visualtest` output:

![screen shot 2015-04-08 at 6 10 47 pm](https://cloud.githubusercontent.com/assets/381633/7289786/ae96aa80-e929-11e4-80b1-3bca406c47a5.png)

Applitools Eyes test runner status UI shows the failure:

![screen shot 2015-04-08 at 6 12 00 pm](https://cloud.githubusercontent.com/assets/381633/7289805/ede6befa-e929-11e4-85c3-f52d5f27b35a.png)

A single failing test for one environment in the Applitools Eyes test runner status UI:

![screen shot 2015-04-08 at 6 13 00 pm](https://cloud.githubusercontent.com/assets/381633/7289815/1ca37c74-e92a-11e4-9e62-ab5ddb365ff8.png)

Generating Your CSS
-------------------

It's helpful sometimes to use a tool like less or sass to aid css development.  This tool allows you to plug that in 
however you see fit, but doesn't require one.  Just output your left to right stylesheet into the `public/style.css` 
file and your right to left stylesheet into the `public/style-rtl.css` using whatever tool you choose to use.

Running The Project's Unit Tests
--------------------------------

`make project-unit-test`

Example Project
---------------

The included example project uses a few tools you might want to swap out with your own preferred tools:

- commonjs
- browserify
- react
- make

Cost Considerations For Various Configurations
----------------------------------------------

The ideal way to use the tool is to purchase as many parallel vms as you can from Sauce Labs, and as many licenses as you 
can from Applitools.  If this is too expensive, you have various options to reduce costs:

- Use less parallel vms.  This will make your test suite run slower.
- Only run the Applitools tests on merges to master.  This will give you slower feedback cycles.

Future Goals ( Pull Requests Appreciated! )  :-)
------------------------------------------------

- A mode to only run by comparing master to current branch for local usage, and non merge to master ci usage.
- Simplifying the jsx naming scheme.
- Add plugin hooks for non commonjs dependency management systems.
- Add plugin hooks for non react based projects.
- Add an example project for angular.
- Add a file system watcher to regenerate the component library when css, js, and templates are changed.
- Add an integration test using the local only run feature.
- Add a functional test using Sauce Labs And Applitools.
- Group all components into a single page which is used for batch diffing the components with links to each individual page still.  Unfortunately, it doesn't look this this is a viable approach from Chrome ( https://code.google.com/p/chromedriver/issues/detail?id=294 ).  According to ( https://bugsnag.com/blog/implementing-a-visual-css-testing-framework ) it also doesn't work in IE, but it does work in Firefox.  Who knows about ios and osx safari and the android stock browser.  There is a workaround which would be to scroll the page and stitch sections of screenshots together.
- Create a shared layout wrapper component for each component on the index grouped page, host this as it’s own npm project to allow selective upgrades.
- For the react / commonjs example, load react from the host pages while still making them work from the require calls, to speed generation time of the component library.
- Add a feature where you can have less vms than selenium environments in case you want to run many os / browser / device combos but not pay for a ton of parallel vms.
- Change the time estimation calculation to account for vm startup time, which is what takes the longest.
- Add a debug or local mode where if a sauce connect tunnel is already open it doesn’t try to reopen it
- Add instructions in the readme for how to run on ci.
- Describe the architecture in a wiki article linked to in the readme.
