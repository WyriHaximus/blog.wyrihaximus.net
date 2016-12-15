---
layout: post
title: "PHP API Clients: Command Bus"
date: 2016-12-15 13:31dw
comments: true
categories:
- PHP
- CommandBus
tags:
- PHP
- CommandBus
social:
  image_relative: /images/posts/command-bus-to-awesome-town-2-638.jpg
---

The [`PHP API Clients`](https://php-api-clients.org/) I'm working on utilizes a [command bus](https://github.com/php-api-clients/command-bus) ([`league/tactician`](http://tactician.thephpleague.com/)) internally. Wrapped in a thing promise layer for 

![Command Bus](/images/posts/command-bus-to-awesome-town-2-638.jpg)

<!-- More -->

# Wrapping Tactician

Initially the clients use tactician directly but that changed early on in wrapping it in a thin layer. The reason to do that was so we can ensure a [`promise`](https://github.com/reactphp/promise) based API but more importantly ensure all commands are run in a [`future tick`](/2015/02/reactphp-ticks/). This is important to make sure we don't block the loop, all handlers are expected to return promises as well so everything can work asynchronously. Among the handlers standardly in the bus are the json decode, hydrate and request handlers. The first has to be wrapped in a tick as it blocks the loop temporary and running it in a tick executes the command at a moment when there is time for it. The hydrate command has the same problem but depending on the resource size takes less then a 10th of a milisecond untill a few miliseconds when using fancy annotations we'll cover in the next post. And last but not leasy the request handler, all requests are promise based anyway which will resolve when the response headers are in.

# Configuring extra commands

But what would a useful command bus be without the ability of adding extra commands into the bus? To easy that we're using `composer.json's` [`extra`](https://getcomposer.org/doc/04-schema.md#extra) section. The JSON below shows the command bus configuration for `api-clients/transport`. It points to the command bus directory and namespace for that directory and then runs it through [`wyrihaximus/tactician-command-handler-mapper`](https://github.com/WyriHaximus/php-tactician-command-handler-mapper) to get a full mapping of the commands and handlers in there.

```json
{
  "extra": {
    "api-clients": {
      "command-bus": {
        "path": "src/CommandBus",
        "namespace": "ApiClients\\Foundation\\Transport\\CommandBus"
      }
    }
  }
}
```

# Conclusion

Although it is a thin wrapping around [`league/tactician`](http://tactician.thephpleague.com/), it is essential to ensure everything runs smoothly.
