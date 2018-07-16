<?php

use PHPUnit\Framework\TestCase;

class SculpinKernelTest extends TestCase
{
    public function testGetAdditionalSculpinBundles()
    {
        $kernel = new SculpinKernel('', '');
        $reflection = new ReflectionObject($kernel);
        $method = $reflection->getMethod('getAdditionalSculpinBundles');
        $method->setAccessible(true);
        $this->assertInternalType('array', $method->invoke($kernel));
    }
}
