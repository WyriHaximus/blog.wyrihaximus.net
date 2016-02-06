---
layout: post
title: "ReactPHP: Filesystem"
date: 2015-03-24 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Filesystem
- EIO
- PHP
social:
  image_relative: /images/posts/1130844_1350357736026_full.jpg
---

This week we'll take a look at the [`react/filesystem`](https://github.com/reactphp/filesystem) package I'm developing under ReactPHP's flag. It's been a great adventure this far and I want to share some things of those wicked project.

![Lion King Stampede](/images/posts/tumblr_inline_n94ubjT3ml1rlpk9c.gif)

<!-- More -->

##### Important note #####

[`react/filesystem`](https://github.com/reactphp/filesystem) isn't done yet and things can be subject to change, non the less I wanted to blog about it and show my current state of work on it. (Writing this post has been a great experience and will flow back into the projects documentation.)

##### Installation #####

Installing the filesystem package is a little more complicated them the rest of the packages as it requires [`ext-eio`](http://pecl.php.net/package/eio) to function. [`ext-eio`](http://pecl.php.net/package/eio) can be installed by running:
 
```sh
pecl install eio
```

After you installed the extension and added [`eio.so`](http://pecl.php.net/package/eio) to your [`php.ini`](http://php.net/manual/en/configuration.file.php) you can install [`react/filesystem`](https://github.com/reactphp/filesystem) using composer:

```sh
composer require react/filesystem
```

##### A word of caution #####

[`EIO`](http://software.schmorp.de/pkg/libeio.html) uses threads to make async filesystem I/O possible and it will autoscale the number of threads needed for that. Most operating systems have an open file limit, hitting that limit will result in an error. So don't try to open everything all at once, that limit is there for very good reasons. If you decide like me to raise that limit (mine is around half a million) and you still try to open as many as possible you will crash and burn your system. The HDD/SSD/SSDD will get swamped and is unable to keep up and fulfill your requests thus crashing the system. So don't raise ever raise that limit unless you know what you are doing and willing to take the risks.

##### Setting up the filesystem #####

Before we can use the filesystem we have to we have to create it. (It is recommended to only create one as for now the effects of creating more then one are unknown.) Setting it up is as simple as running the [`create`](https://github.com/reactphp/filesystem#creating-filesystem-object) method on the filesystem object. That will try and create a new adapter if you don't hand one, in this case it's just the [`EIO`](http://pecl.php.net/package/eio) adapter.

```php
<?php

require dirname(__DIR__) . '/vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();
$filesystem = \React\Filesystem\Filesystem::create($loop);
```

##### Listing directory contents #####

The filesystem has a only a few methods. First the [`dir`](https://github.com/reactphp/filesystem#directory-object) method will create and return an object representing the given directory. (Note that the directory doesn't have to exist as you can also create it (recursively) with the directory object.) For the first example we'll list directory contents in to root of the examples project. That works by first creating the filesystem, then call the [`dir`](https://github.com/reactphp/filesystem#directory-object) method and do an [`ls`](http://en.wikipedia.org/wiki/Ls) on that directory. Since this part of the API is async a promise is returned. Once everything is listed, the promise will resolve with a list of nodes. These can be both files and directories:

```php
<?php

require 'vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();
$dir = \React\Filesystem\Filesystem::create($loop)->dir(dirname(__DIR__));
$dir->ls()->then(function (\SplObjectStorage $list) {
    foreach ($list as $node) {
        echo $node->getPath(), PHP_EOL;
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17989.js" id="asciicast-17989" async></script>

##### Listing all PHP files in the examples repo #####

Now lets say we want all PHP files in a directory and it's subdirectories. Instead of calling `ls` we'll call `lsRecursive` to get the entire directory tree from the given directory. Once the listing is in we'll use [`RegexIterator`](http://php.net/RegexIterator) to get all files ending with `.php`. As you might notice we'll also filtering out the files in `vendor/`, that is so they don't pollute our results:

```php
<?php

require 'vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();
$dir = \React\Filesystem\Filesystem::create($loop)->dir(dirname(__DIR__));
$dir->lsRecursive()->then(function (\SplObjectStorage $list) {
    $phpFiles = new RegexIterator($list, '/.*?.php$/');
    foreach ($phpFiles as $node) {
        if (strpos($node->getPath(), 'vendor') !== false) {
            continue;
        }
        echo $node->getPath(), PHP_EOL;
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17990.js" id="asciicast-17990" async></script>

##### Getting the size of all PHP files #####

We have all the PHP files in this repo, but we like to know how big the files are and what their combined size is. The file object has a `size` method which enables you get that information, under the hood it uses a [`stat`](http://en.wikipedia.org/wiki/Stat_%28system_call%29) call which reveals more information about an [`inode`](http://en.wikipedia.org/wiki/Inode). You might notice the use of [promise](/2015/02/reactphp-promises/) chaining, that makes it easy and clean to get all the sizes in a clean and simple way: 

```php
<?php

require 'vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();
$dir = \React\Filesystem\Filesystem::create($loop)->dir(dirname(__DIR__));
$dir->lsRecursive()->then(function (\SplObjectStorage $list) {
    $phpFiles = new RegexIterator($list, '/.*?.php$/');
    $promises = [];
    foreach ($phpFiles as $node) {
        if (strpos($node->getPath(), 'vendor') !== false) {
            continue;
        }
        $file = $node;
        $promises[] = $file->size()->then(function ($size) use ($file) {
            echo $file->getPath(), ': ', number_format($size / 1024, 2), 'KB', PHP_EOL;
            return $size;
        });
    }
    \React\Promise\all($promises)->then(function ($sizes) {
        $total = 0;
        foreach ($sizes as $size) {
            $total += $size;
        }
        echo 'Total: ', number_format($total / 1024, 2), 'KB', PHP_EOL;
    });
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17991.js" id="asciicast-17991" async></script>

##### Size, md5 en update time #####

Now that we know how big the files are we also want to hash their contents, thus reading our their contents before hashing them with [`md5`](http://en.wikipedia.org/wiki/Md5). Now that might sound simple, and from the shown API that is simple but that is just syntactic sugar around the file open and read [stream](/2015/02/reactphp-streams) calls. Another thing I've sneaked into this example is a touch call on the file object. When touch is called the file will be either created or the access time is updated. The effects of that are show in the demo. 

```php
<?php

require 'vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();
$dir = \React\Filesystem\Filesystem::create($loop)->dir(dirname(__DIR__));
$dir->lsRecursive()->then(function (\SplObjectStorage $list) {
    $phpFiles = new RegexIterator($list, '/.*?.php$/');
    $promises = [];
    foreach ($phpFiles as $node) {
        if (strpos($node->getPath(), 'vendor') !== false) {
            continue;
        }
        $file = $node;
        $contents = $file->getContents()->then(function ($contents) {
            return md5($contents);
        });
        $promises[] = \React\Promise\all([$file->stat(), $contents])->then(function ($data) use ($file) {
            list ($stat, $md5) = $data;
            echo substr($file->getPath(), strlen(dirname(__DIR__)));
            echo ': ', number_format($stat['size'] / 1024, 2), 'KB, ';
            echo 'md5 hash:', $md5, ', ';
            echo 'access time: ', (new DateTime('@' . $stat['atime']))->format('r'), PHP_EOL;
            $file->touch();
            return $stat['size'];
        });
    }
    \React\Promise\all($promises)->then(function ($sizes) {
        $total = 0;
        foreach ($sizes as $size) {
            $total += $size;
        }
        echo 'Total: ', number_format($total / 1024, 2), 'KB', PHP_EOL;
    });
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17992.js" id="asciicast-17992" async></script>

##### Community examples #####

No community examples this week, there aren't any example out there using it in open source as far as I could find.

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/filesystem)

##### Conclusion #####

The filesystem package is still in the works but already shown it's brute power with a simple and easy to use API. While developing it I've seen it hit 50MB/s on both a whole cluster of small files as well as the same speed on 1 big file read. These figures are all relative on a medium end machine I've initially bought to give talks with. At the same time I've seen it peak up to 100MB/s and hold there for a couple of seconds. Honestly `EIO` scares me at times but in small portions it is great to work with. The examples shown above show how easy it is to use but that simplicity makes it easy to get started as well go to far with it. So with great power comes great responsibility. I've been considering added call pools to it so you can't over do it with only a limited number of outstanding I/O operations at any given time.
