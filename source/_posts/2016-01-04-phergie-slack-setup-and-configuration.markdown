---
layout: post
title: "Phergie Slack setup and configuration"
date: 2015-11-05 21:12dw
comments: true
categories:
- PHP
- Phergie
- ReactPHP
tags:
- PHP
- Phergie
- ReactPHP
- IRC
---

Ever since the rise of [Slack](https://slack.com/) and the [Phergie v3](https://www.phergie.org/) connecting them has been on my to do list. And while [Slack API](https://api.slack.com/) is the better alternative this was fun nontheless.

<!-- More -->


##### Prerequisites #####

* A [Slack](https://slack.com/)
* Phergie bot ready to be used, take a look at the [Freenode configuration example](https://github.com/phergie/phergie-freenode)

##### Set up the IRC gateway #####

Slack has an IRC gateway we'll be using to connect to it. Assuming you're the slacks admin, go to [my.slack.com/admin/settings](https://my.slack.com/admin/settings) and enable it under `Permissions` -> `Gateways`. While it is possible it is recommended not to use the non-ssl server and leave it disabled.

##### Create a user for the bot #####

Now create a user for the bot, but not that it can't be a bot account as defined in the admin it has to be a normal user. (Bot accounts can't connect to the IRC gateway.)

##### Look up IRC details #####

Once you've created the new user go to [my.slack.com/account/gateways](https://my.slack.com/account/gateways) as that user and lookup the `host`, `user`, and `pass` values. Lets say they are for the rest of the examples:

* Host: myawesomeslack.irc.slack.com
* User: everythingisawesome
* Pass: iwehrihwoifhoqiweiwhvwdivqwe

##### Defining a connection #####

Configure the connection as follows and you're Phergie bot will connect to your Slack instead of a regular IRC server: 

```php
new Connection([
    'serverHostname'    => 'myawesomeslack.irc.slack.com',
    'serverPort'        => 6697,
    'username'          => 'everythingisawesome',
    'realname'          => 'everythingisawesome',
    'nickname'          => 'everythingisawesome',
    'password'          => 'iwehrihwoifhoqiweiwhvwdivqwe',
    'options'           => [
        'transport'     => 'ssl',
    ],
]);
```

##### Conclusion #####

Connecting Phergie to Slack was surprisingly easier then expected. And it gives you a fully functional Phergie bot on your slack:

![Phergie on Slack](/images/posts/phergie-slack.png)
