---
layout: post
title: "Running php unit tests on Windows using AppVeyor and Chocolatey"
date: 2016-11-03 16:59dw
comments: true
categories:
- PHP
- AppVeyor
- Chocolatey
tags:
- PHP
- AppVeyor
- Chocolatey
social:
  image_relative: /images/posts/logo-composer-transparent3.png
---

[`Travis`](https://travis-ci.org/) is the go to CI for run your tests on as an opensource project, but it is limited to only Linux (and with some hassle you can also run your tests on OS X). But it doesn't do Windows, and while popular opinion states you shouldn't run (PHP on) Windows, there is a significant amount of shops and developers that do. In this post I'll walk you through setting up your tests on [`AppVeyor`](https://www.appveyor.com/), a Windows CI.

![Composer](/images/posts/logo-composer-transparent3.png)

<!-- More -->

# AppVeyor, Travis for Windows but with a twist

At first glance [`Travis`](https://travis-ci.org/) and [`AppVeyor`](https://www.appveyor.com/) look a like, ignoring the looks, they both lets you run builds to test or do others thing, and both are controlled by a YAML file. But [`AppVeyor`](https://www.appveyor.com/) has a few gotches you need to be aware of. First of all you can create more then one build setup, so be sure to double check if you haven't already create a build for a project.

# Setting up the configuration file

## The basics

[`AppVeyor`](https://www.appveyor.com/) needs to know a few basics such as the platform we want to run on, since 64bits is widely used these days I'm configuring my builds to only test on `x64`, but if you want/need to test on 32bits systems you can add `x86` to the list. We're also giving it a generic clone folder. Initially I had a different folder for each project but that turns messy when copying the config between repositories. 

```YAML
build: false
platform:
  - x64
clone_folder: c:\projects\php-project-workspace
```

## The build matrix

The build matrix contains a vital piece of information, namely the `php_ver_target`, we need when installing `PHP`. Bare in mind that [`Chocolatey`](https://chocolatey.org/) pulls it's downloads from [`windows.php.net`](http://windows.php.net/download/) so you're limited to PHP versions available there. At the time of writing that is PHP `5.6` and `7.0`. This build matrix is based on my [lowest, current, highest build matrix for travis](/2015/06/test-lowest-current-and-highest-possible-on-travis). 

```YAML
## Build matrix for lowest and highest possible targets
environment:
  matrix:
  - dependencies: lowest
    php_ver_target: 7.0
  - dependencies: current
    php_ver_target: 7.0
  - dependencies: highest
    php_ver_target: 7.0
```

## The composer cache (and only the composer cache)

Now we want to cache composers downloaded files cache to speed up `composer install`. I can hear you think after reading the installation for PHP we could [probably cache that](https://www.appveyor.com/docs/build-cache/#caching-chocolatey-packages) as well, don't! [`AppVeyor`](https://www.appveyor.com/) has a limit of [1GB](https://www.appveyor.com/docs/build-cache/#cache-size-beta) of cache space per user (free plan), so caching composers dist files isn't much of a problem. But when you start caching [`Chocolatey`](https://chocolatey.org/) files it quickly ramps up to 40 to 50MB per job. So in the config in this post we have 3 jobs, which is 120 to 150MB in total. Add PHP 5.6  to your build matrix and you ramp it up to 300MB. So that's a third of your cache gone. Instead only caching composers dist files is about 5MB per repo in my situation. Going to up 30MB when running 6 jobs, giving you up to ten times as much cache available. This of course isn't an issue when you have a few packages you test on [`AppVeyor`](https://www.appveyor.com/), but in my case, well I have [a lot](https://packagist.org/users/WyriHaximus/packages/)... Note that we link composers cache location to the lock file, when ever that file changes the cache is wiped.

```YAML
## Cache composer bits
cache:
    - '%LOCALAPPDATA%\Composer\files -> composer.lock'
```

## Environment variables

To work correctly, and for some magic beyond my investigations we need to set a few environment variables. (Tried removing the PHP one but it didn't have the desired effect.)

```YAML
## Set up environment variables
init:
    - SET PATH=C:\Program Files\OpenSSL;c:\tools\php;%PATH%
    - SET COMPOSER_NO_INTERACTION=1
    - SET PHP=1
    - SET ANSICON=121x90 (121x90)
```

## Installing PHP and run composer install

This is where the true magic happens. This section ensures PHP, composer, and your packages dependencies are installed. It looks like a lot but what is important is `cinst`, `appveyor DownloadFile`, and the `composer` calls.

```YAML
## Install PHP and composer, and run the appropriate composer command
install:
    - IF EXIST c:\tools\php (SET PHP=0)
    - ps: appveyor-retry cinst -y php --version ((choco search php --exact --all-versions -r | select-string -pattern $Env:php_ver_target | Select-Object -first 1) -replace '[php|]','')
    - cd c:\tools\php
    - IF %PHP%==1 copy php.ini-production php.ini /Y
    - IF %PHP%==1 echo date.timezone="UTC" >> php.ini
    - IF %PHP%==1 echo extension_dir=ext >> php.ini
    - IF %PHP%==1 echo extension=php_openssl.dll >> php.ini
    - IF %PHP%==1 echo extension=php_mbstring.dll >> php.ini
    - IF %PHP%==1 echo extension=php_fileinfo.dll >> php.ini
    - IF %PHP%==1 echo @php %%~dp0composer.phar %%* > composer.bat
    - appveyor-retry appveyor DownloadFile https://getcomposer.org/composer.phar
    - cd c:\projects\php-project-workspace
    - IF %dependencies%==lowest appveyor-retry composer update --prefer-lowest --no-progress --profile -n
    - IF %dependencies%==current appveyor-retry composer install --no-progress --profile
    - IF %dependencies%==highest appveyor-retry composer update --no-progress --profile -n
    - composer show
```

First `cinst`. `cinst` is part of the pre installed [`Chocolatey`](https://chocolatey.org/) software, it is in reality a short cut to [`choco install`](https://chocolatey.org/docs/commands-install). 
With some help from [`Rob Reynolds`](https://twitter.com/ferventcoder) from [`Chocolatey`](https://chocolatey.org/) and some [`PowerShell`](https://en.wikipedia.org/wiki/PowerShell) magic I've came to the following one liner:

```powershell
cinst -y php --version ((choco search php --exact --all-versions -r | select-string -pattern $Env:php_ver_target | Select-Object -first 1) -replace '[php|]','')
```

Lets dissect that. First we run `choco search php --exact --all-versions -r` which lists all PHP versions, one version a line in the following format `php|7.0.12`. It isn't perfect but it is a good start.
Next we filter out only the versions we want, in our case `7.0.*`. By using [`select-string`](http://ss64.com/ps/select-string.html) we can do exactly that, we pass it the `php_ver_target` environment variable as the pattern `select-string -pattern $Env:php_ver_target`. This leaves us with a list of only PHP `7.0.x` versions.
Because we only want the latest version we run it through `Select-Object` to select the top line using `Select-Object -first 1`. We wrap all of these commands in brackets so we can perform the next operation on it. 
`cinst` doesn't understand a version formatted `php|7.0.12` we have to strip the `php|` off, we can do that with the build in `$var -replace`. Be case we wrapped the previous operations in brackets it is treated as `$var` in powershell and we can run the replace over it. ` -replace '[php|]',''`.
Once again we wrap the result of that operation in brackets so it is presented to `cinst` as a `$var`. Now we can do the actual installation with `cinst`.
Running `cinst` with `-y` will confirm all prompts, the second argument `php` is the package we want to install, and `--version` uses the version we determent with the previous commands.
All of that combined will install the latest PHP `7.0` version we'll run our tests against.

Beyond that it is all fairly simple, we enable a few extensions, downloaded composer, install dependencies, and show them (useful for debugging dependencies issues). An interesting note here is that `appveyor-retry` will retry the command is prepends when it fails.

## Running your tests

All what is left now is run out tests:

```YAML
## Run the actual test
test_script:
    - cd c:\projects\php-project-workspace
    - vendor/bin/phpunit -c phpunit.xml.dist
```
