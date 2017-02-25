---
layout: post
title: "Running php unit tests on Windows using AppVeyor and Chocolatey"
date: 2016-11-04 13:31dw
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
  image_relative: /images/posts/appveyor-and-chocolatey.png
---

[`Travis`](https://travis-ci.org/) is the go to CI for run your tests on as an opensource project, but it is limited to only Linux (and with some hassle you can also run your tests on OS X). But it doesn't do Windows, and while popular opinion states you shouldn't run (PHP on) Windows, there is a significant amount of shops and developers that do. In this post I'll walk you through my configuration file for [`AppVeyor`](https://www.appveyor.com/), a Windows CI.

![AppVeyor && Chocolatey](/images/posts/appveyor-and-chocolatey.png)

<!-- More -->

# AppVeyor, Continuous Integration for Windows. Like Travis but with a twist

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

The build matrix contains a vital piece of information, namely the `php_ver_target`, we need when installing `PHP`. Bare in mind that [`Chocolatey`](https://chocolatey.org/) pulls it's downloads from [`windows.php.net`](http://windows.php.net/download/) so you're limited to PHP versions available there. Chocolatey allows installing PHP `5.3` to `7.1` ~~At the time of writing that is PHP `5.6` and `7.0`.~~ This build matrix is based on my [lowest, current, highest build matrix for travis](/2015/06/test-lowest-current-and-highest-possible-on-travis). 

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

Now we want to cache composers downloaded files cache to speed up `composer install`. I can hear you think after reading the installation for PHP we could [probably cache that](https://www.appveyor.com/docs/build-cache/#caching-chocolatey-packages) as well, don't! [`AppVeyor`](https://www.appveyor.com/) has a limit of [1GB](https://www.appveyor.com/docs/build-cache/#cache-size-beta) of cache space per user (free plan), so caching composers dist files isn't much of a problem. But when you start caching [`Chocolatey`](https://chocolatey.org/) files it quickly ramps up to 40 to 50MB per job. So in the config in this post we have 3 jobs, which is 120 to 150MB in total. Add PHP 5.6  to your build matrix and you ramp it up to 300MB. So that's a third of your cache gone. Instead only caching composers dist files is about 5MB per repo in my situation. Going to up 30MB when running 6 jobs, giving you up to ten times as much cache available. This of course isn't an issue when you have a few packages you test on [`AppVeyor`](https://www.appveyor.com/), but in my case, well I have [a lot](https://packagist.org/users/WyriHaximus/packages/)... Note that we link composers cache location to the lock file, whenever the lock file changes the cache is wiped.

```YAML
## Cache composer, chocolatey and php bits
cache:
    - '%LOCALAPPDATA%\Composer\files -> composer.lock'
    - composer.phar
    # Cache chocolatey packages
    - C:\ProgramData\chocolatey\bin -> .appveyor.yml
    - C:\ProgramData\chocolatey\lib -> .appveyor.yml
    # Cache php install
    - c:\tools\php -> .appveyor.yml
```

## Environment variables

To work correctly, and for some magic beyond my investigations we need to set a few environment variables. ~~(Tried removing the PHP one but it didn't have the desired effect.)~~ Due to how Windows powerscript works, we need to add some items to the PATH environment variable for things to work.

```YAML
## Set up environment variables
init:
    - SET PATH=C:\Program Files\OpenSSL;c:\tools\php;%PATH%
    - SET COMPOSER_NO_INTERACTION=1
    - SET PHP=1 # This var is connected to PHP install cache
    - SET ANSICON=121x90 (121x90)
```

## Installing PHP and run composer install

This is where the true magic happens. This section ensures PHP, composer, and your package's dependencies are installed. It looks like a lot but what is important is `cinst`, `appveyor DownloadFile`, and the `composer` calls.

```YAML
## Install PHP and composer, and run the appropriate composer command
install:
    - IF EXIST c:\tools\php (SET PHP=0) # Checks for the PHP install being cached
    - ps: appveyor-retry cinst --params '""/InstallDir:C:\tools\php""' --ignore-checksums -y php --version ((choco search php --exact --all-versions -r | select-string -pattern $env:php_ver_target | sort { [version]($_ -split '\|' | select -last 1) } -Descending | Select-Object -first 1) -replace '[php|]','')
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

## Run the actual test
test_script:
    - cd c:\projects\php-project-workspace
    - vendor/bin/phpunit -c phpunit.xml.dist

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
With some help from [`Rob Reynolds`](https://twitter.com/ferventcoder) and [`Kim Nordmo`](https://github.com/AdmiringWorm) from [`Chocolatey`](https://chocolatey.org/) and some [`PowerShell`](https://en.wikipedia.org/wiki/PowerShell) magic I've came to the following one liner:

```powershell
cinst --params '""/InstallDir:C:\tools\php""' --ignore-checksums -y php --version ((choco search php --exact --all-versions -r | select-string -pattern $env:php_ver_target | sort { [version]($_ -split '\|' | select -last 1) } -Descending | Select-Object -first 1) -replace '[php|]','')
```

Lets dissect that. First we run `choco search php --exact --all-versions -r` which lists all PHP versions, one version a line in the following format `php|7.0.12`. It isn't perfect but it is a good start.
Next we filter out only the versions we want, in our case `7.0.*`. By using [`select-string`](http://ss64.com/ps/select-string.html) we can do exactly that, we pass it the `php_ver_target` environment variable as the pattern `select-string -pattern $Env:php_ver_target`. This leaves us with a list of only PHP `7.0.x` versions.
Because we only want the latest version we run it through `Select-Object` to select the top line using `Select-Object -first 1`. We wrap all of these commands in brackets so we can perform the next operation on it. 
`cinst` doesn't understand a version formatted `php|7.0.12` we have to strip the `php|` off, we can do that with the build in `$var -replace`. Be case we wrapped the previous operations in brackets it is treated as `$var` in powershell and we can run the replace over it. ` -replace '[php|]',''`.
Once again we wrap the result of that operation in brackets so it is presented to `cinst` as a `$var`. Now we can do the actual installation with `cinst`.
Running `cinst` with `-y` will confirm all prompts, `--ignore-checksums` don't run the checksum checks which is could be needed at time, the second argument `php` is the package we want to install, and `--version` uses the version we determent with the previous commands. (We're also putting a `appveyor-retry` in front of it to ensure it will do 3 attempts before giving up. Giving windows can be flaky at times we need the retries, and `--ignore-checksums` to ensure the build doesn't fail on trivial errors.)
Note: due to a recent change in Chocolatey on 2017/02/14 installs now default PHP to a version specific install directory to allow sideloading. Thus we have to specify the install directory `--params '""/InstallDir:C:\tools\php""'`. We also have different sorting options for the version search in Chocolatey to ensure we get the most recent minor version available for windows. In this case we search for the general version with `$Env:php_ver_target` then sort all minor versions found in desending order selecting the last version with | `sort { [version]($_ -split '\|' | select -last 1) } -Descending` finally we select the first object and return the value to `cinst`.
All of that combined will install the latest PHP `7.0` version we'll run our tests against.

Beyond that it is all fairly simple, we enable a few extensions, downloaded composer, install dependencies, and show them (useful for debugging dependencies issues).

## Running your tests

All what is left now is run out tests:

```YAML
## Run the actual test
test_script:
    - cd c:\projects\php-project-workspace
    - vendor/bin/phpunit -c phpunit.xml.dist
```

## Conclusion

This configuration file gives you the way on configuring PHP versions as you might be used to on Travis. You can see the [`api-clients/psr7-oauth1`](https://github.com/php-api-clients/psr7-oauth1) package is one of the repo's using it. You can see it on [AppVeyor here](https://ci.appveyor.com/project/WyriHaximus/psr7-oauth1).

![api-clients/psr7-oauth1 jobs](/images/posts/AK0kM2s.png)

## Edits

* 8 January 2017 - worded notes about `appveyor-retry` and `--ignore-checksums` into the `cinst` part of the post. Thanks to [`Niklas Keller`](https://github.com/kelunik)'s efforts and related [post](http://blog.kelunik.com/2017/01/08/travis-composer-dependencies.html).
* 25 Febuary 2017 - Added notes about Chocolatey versioned install directories, improved version sorting, and additional notes. Thanks to [`Walt Sorensen`](https://github.com/photodude) for the updates based on the information and changes to Chocolatey made by [`Kim Nordmo`](https://github.com/AdmiringWorm).
