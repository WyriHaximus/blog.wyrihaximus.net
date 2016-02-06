---
layout: post
title: "ReactPHP: Sockets"
date: 2015-03-03 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Sockets
- PHP
social:
  image_relative: /images/posts/tumblr_lme1x5VCG61qhq4cpo1_500.png
---

One method of communicating with other programs is over sockets. This week we'll focus on the `react/socket` package that allows programs listen for incoming connections and thus create our own server program.

![Blue matrix code](/images/posts/tumblr_lme1x5VCG61qhq4cpo1_500.gif)

<!-- More -->

##### Installation #####

[`react/socket`](https://github.com/reactphp/socket) requires the [event loop](/2015/02/reactphp-event-loop) and [streams](/2015/02/reactphp-streams) to work, installing it will pull those in as well:

```sh
composer require react/socket
```

##### Simple echo server #####

Lets take the [piping example from the stream article](/2015/02/reactphp-streams#piping) and turn that include a client-server version using sockets. When a new connection comes in the `connection` event will trigger on the socket server object. The first argument of the callback you pass as event listener is the new connection. Just like a [stream](/2015/02/reactphp-streams) you can read from it with the `data` event and write to it with the `write` method. Infact a connection is nothing more then a slightly adjusted stream for sockets.

As you might notice I've added an array with colours, that is to distinquish different connections from the servers terminal window. Using [`malenki/ansi`](https://github.com/malenkiki/ansi) to write in colour to the terminal. (Using a simple method for now that will run out of colours at some point.)

```php
<?php

require 'vendor/autoload.php';

$colours = ['red', 'green', 'yellow', 'blue', 'purple', 'cyan'];

$loop = React\EventLoop\Factory::create();
$socket = new React\Socket\Server($loop);

// This event triggers every time a new connection comes in
$socket->on('connection', function ($conn) use ($colours) {
    $colour = array_pop($colours); // Only doing this as an example, you will run out of colours.

    // Event listener for incoming data
    $conn->on('data', function ($data, $conn) use ($colour) {
        // Write data back to the connection
        $conn->write($data);

        // Echo the data into our terminal window
        echo (new \Malenki\Ansi($data))->fg($colour);
    });
});

// Listen on port 1337
$socket->listen(1337);

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17232.js" id="asciicast-17232" async></script>

The server handles both connections fine and only responds to the one sending the data because it's scope is limited to the current connection in the event listener.

##### Passing data between connections #####

Now depending on your application you might want to pass data from one connection to the other or others. The following example stores all open connections and writes to them what ever another connection is sending something to the server. To keep the code clean I've placed all the connection specific code into a class. We could take that one step further and create a connection pool object to use instead of the `SplObjectStorage`. When we give that a broadcast method, the `Connection` class doesn't have to handle iterating over all connections, the connection pool does that for it. But that's beyond the scope of this example.

```php
<?php

class Connection
{
    protected $colour;
    protected $connections;

    public function __construct($conn, $colour, $connections)
    {
        $this->colour = $colour;
        $this->connections = $connections;
        
        $this->connections->attach($conn);

        // Event listener for incoming data
        $conn->on('data', [$this, 'onData']);
        
        // Handle the on close event and remove the connection from the connections pool
        $conn->on('close', [$this, 'onClose']);
    }
    
    public function onData($data)
    {
        // Write data that came in from this connection into all connection
        foreach ($this->connections as $connection) {
            $connection->write($data);
        }
        
        // Echo the data into our terminel window
        echo (new Malenki\Ansi($data))->fg($this->colour);
    }
    
    public function onClose($conn)
    {
        $this->connections->detach($conn);
    }
}

require 'vendor/autoload.php';

$colours = ['red', 'green', 'yellow', 'blue', 'purple', 'cyan'];
$connections = new \SplObjectStorage();

$loop = React\EventLoop\Factory::create();
$socket = new React\Socket\Server($loop);

// This event triggers every time a new connection comes in
$socket->on('connection', function ($conn) use (&$colours, $connections) {
	$colour = array_pop($colours); // Only doing this as an example, you will run out of colours.
	
	// Instancing a new connection object per connection
	new Connection($conn, $colour, $connections);
});

// Listen on port 1337
$socket->listen(1337);

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17233.js" id="asciicast-17233" async></script>

##### Tic Tac toe ##### {#tictactoe}

Most socket servers do more then just pass the data around to all, the following example is a tic tac toe server for two players. It doesn't start until two players are connected and ends once the game is over. [`wyrihaximus/tic-tac-toe`](https://github.com/WyriHaximus/php-tic-tac-toe) has been create to power it and keep the game logic out of the server.

```php
<?php

require 'vendor/autoload.php';

use React\EventLoop\Factory;
use React\Promise\Deferred;
use React\Socket\Connection;
use React\Socket\Server;
use WyriHaximus\TicTacToe\Game;
use WyriHaximus\TicTacToe\Player;
use WyriHaximus\TicTacToe\Ui;

class PlayerConnection extends Player
{
    /**
     * @var Connection
     */
    protected $connection;

    /**
     * @var Game
     */
    protected $game;

    /**
     * @var string
     */
    protected $buffer = '';

    public function __construct(Connection $connection)
    {
        $this->connection = $connection;
        $this->connection->on('data', [$this, 'onData']);
        $this->connection->write('Welcome to Tic tac Toe, the game will start when two players are connected!' . PHP_EOL);
    }

    public function getConnection()
    {
        return $this->connection;
    }

    public function move(Game $game)
    {
        $this->game = $game;
        $this->writeBoard();
        $this->connection->write('Your turn:' . PHP_EOL);
    }

    public function onData($data)
    {
        $this->buffer .= $data;
        $this->buffer = strtolower($this->buffer);

        if (strpos($this->buffer, PHP_EOL) !== false) {
            $chunks = explode(PHP_EOL, $this->buffer);
            $this->buffer = array_pop($chunks);
            foreach ($chunks as $chunk) {
                list($col, $row) = str_split($chunk);

                try {
                    $this->game->move($this, [
                        'col' => $col,
                        'row' => $row,
                    ]);
                    $this->writeBoard();
                } catch (\InvalidArgumentException $e) {
                    $this->move($this->game);
                }
            }
        }
    }

    protected function writeBoard()
    {
        $ui = Ui::printStatus($this->game);
        $this->connection->write($ui);
        echo $ui;
    }
}

$loop = Factory::create();
$socket = new Server($loop);

$players = [];

$socket->on('connection', function (Connection $conn) use (&$players, $socket) {
    if (count($players) < 2) {
        $players[] = new PlayerConnection($conn);
    }

    if (count($players) == 2) {
        $deferred = new Deferred();
        $deferred->promise()->then(function ($results) use (&$players, $socket) {
            foreach ($results as $result) {
                foreach ($players as $player) {
                    if ($player === $result[0]) {
                        $player->getConnection()->end('You ' . $result[1] . PHP_EOL);
                    }
                }
            }
            $socket->shutdown();
        });
        $game = new Game($players[0], $players[1]);
        $game->start($deferred);
    }
});

$socket->listen(1337, '0.0.0.0');

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17490.js" id="asciicast-17490" async></script>

##### Community examples #####

This week we'll take a peek at websockets. Websockets are a way to communicate bidirectionally with your webbased application, [`Ratchet`](http://socketo.me/) (raw websockets and [`WAMP1`](http://wamp.ws/spec/wamp1/)) and [`Thruway`](https://github.com/voryx/Thruway) ([`WAMP2`](http://wamp.ws/spec/)) let you build websocket servers in PHP.

##### Ratchet and Thruway #####

Both packages let you build a websocket server where ratchet lets you build raw websocket servers (just the websocket protocol and no abstraction on it). It also supports the WAMP1 abstraction layer for basic [RPC](http://wamp.ws/faq/#rpc) and [PubSub](http://wamp.ws/faq/#pubsub) functionality over websockets. Thruway implements WAMP1's successor WAMP2. WAMP2 has grown more towards a messaging protocol with support for multiple transport layers (ratchet's raw websockets for example). While thruway has a steep learning curve it's well worth the time invested in it and a lot more powerful.

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/sockets)

##### Conclusion #####

Sockets lets you build your own servers. No matter what you're serving with your ReactPHP powered server, sockets take care of accepting the connection and notifying you of it with a connection object. That lets you interact with each connection separately, wheither it's incoming data from it, writing data to it, or closing the connection. These are the basics to interact with remote programs.
