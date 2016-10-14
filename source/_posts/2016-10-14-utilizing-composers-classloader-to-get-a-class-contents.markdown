---
layout: post
title: "Utilizing composer's classloader to locate a class"
date: 2016-10-14 16:59dw
comments: true
categories:
- PHP
- Composer
- Short Post
tags:
- PHP
- Composer
- Short Post
social:
  image_relative: /images/posts/logo-composer-transparent3.png
---

[`Composer`](https://getcomposer.org/) and [`Packagist`](https://packagist.org/) have fundamentally changed the PHP package landscape by providing a central package registry. And a tool to easily install package listed in that registry and autoload them using PSR-<s>0</s>4. But the composer tooling can be used for more then just installing and autoloading files. We'll explore one of them in this post.

![Composer](/images/posts/logo-composer-transparent3.png)

<!-- More -->

# Locating a file

For a project I need to parsed PHP classes and I'm using [`nikic/php-parser`](https://github.com/nikic/PHP-Parser), which only accepts a string. (Fair enough it isn't it's responsibility to find a class for me.) Composer to the rescue!

## Locating autoload.php

Now this is the hardest part: Locate the `autoload.php` file (which is just a intermediary file between you and the real autoload file). One can fairly safely assume that it is always located at `vendor/autoload.php`, but where that is relatively to your current file is the tricky part. In the package I'm working on the following code detects the location of `autoload.php`. First it tries `../vendor/autoload.php` for when it is just the package, and `../../../vendor/autoload.php` for when it is used in a project.

```php
private function locateClassloader()
{
    foreach ([
        dirname(__DIR__) . DS . 'vendor' . DS . 'autoload.php',
        dirname(dirname(dirname(__DIR__))) . DS . 'autoload.php',
    ] as $path) {
        if (file_exists($path)) {
            return require $path;
        }
    }

    throw new RuntimeException('Unable to locate class loader');
}
```

### Locating the file we want to parse

Since we have the class loader from `autoload.php` we can utilize that to file a class we want to use:

```php
$classLocation = $this->locateClassloader()->findFile($classToFind);
```

We now have the location of the class, as found by `Composer` in `$classLocation`. Or false when it couldn't find it.

### Bonus: Parsing the file

```php
$ast = (new ParserFactory)->create(ParserFactory::PREFER_PHP7)->parse(file_get_contents($classLocation));
```
