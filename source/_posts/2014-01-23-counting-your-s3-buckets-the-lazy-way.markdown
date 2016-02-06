---
layout: post
title: "Counting your S3 buckets the lazy way"
date: 2014-01-23 11:30
comments: true
categories:
- AWS
- S3
- JavaScript
- jQuery
---

As a programmer, counting a bunch of items on a webpage is a quick task when you automate it. In this tiny post I'll explain how to count your S3 buckets with a single line of jQuery.

![Amazon Web Services Logo](/images/posts/aws_logo_web_194px_2.png)

<!-- More -->

So before we can get started head to the AWS console and open [S3](https://console.aws.amazon.com/s3/home). 

### In Chrome ###

Open your developer console and go the console tab and locate `<top frame>`. That is a dropdown, click it and select `Console.html`.

![Chrome S3 iframe](/images/posts/2014-01-23-counting-your-s3-buckets-the-lazy-way/chrome-s3-iframe.png)

Now run the following bit of jQuery:

~~~javascript
$('#bucket-list-view tbody tr').length;
~~~

This returns the number of buckets on your account.

### Other browsers ###

Open your developer console and head to the elements tab. Locate the iframe directly under the body element.

![S3 iframe](/images/posts/2014-01-23-counting-your-s3-buckets-the-lazy-way/s3-iframe.png)

Now open that iframe in the new tab and open your developer console again. Go to the console tab and run the bit of jQuery mentioned above.

### Conclusion ###

These little things make my line of work just that extra bit more fun.