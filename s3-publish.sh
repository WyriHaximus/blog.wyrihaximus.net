#!/bin/bash

vendor/bin/sculpin generate --env=prod || ( echo "Could not generate the site" && exit )

S3CMD_PATH=`which s3cmd`
if [ $? -ne 0 -o -z "$S3CMD_PATH" ]
then
    echo "s3cmd not found - unable to deploy"
    exit 3
fi

s3cmd --config="~/.aws/config" --force --recursive --no-delete-removed --bucket-location=eu-west-1 --progress --acl-public sync output_prod/ s3://blogwyrihaximusnet
