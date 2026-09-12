SHELL=bash

.PHONY: *

CONTAINER_REGISTRY_REPO=ghcr.io/wyrihaximusnet/php
PHP_VERSION=7.4
CONTAINER_NAME=${CONTAINER_REGISTRY_REPO}:${PHP_VERSION}-nts-alpine-dev-root

ifneq ("$(wildcard /.you-are-in-a-wyrihaximus.net-php-docker-image)","")
    IN_DOCKER=TRUE
else
    IN_DOCKER=FALSE
endif

ifeq ("$(IN_DOCKER)","TRUE")
    DOCKER_RUN:=
else
    DOCKER_RUN:=docker run --rm -i \
        -v "`pwd`:`pwd`" \
        -w "`pwd`" \
        ${CONTAINER_NAME}
endif

generate: ## Generate the blog for production
ifeq ("$(IN_DOCKER)","TRUE")
	composer install --ansi --no-progress --no-interaction --prefer-dist -o
	vendor/bin/sculpin generate --env=prod
	find output_prod
else
	$(DOCKER_RUN) bash -c "composer install --ansi --no-progress --no-interaction --prefer-dist -o && vendor/bin/sculpin generate --env=prod && find output_prod"
endif

task-list-ci:
	@echo "[]"

task-list-ci-all:
	@echo "[]"

task-list-ci-dos:
	@echo "[]"

task-list-ci-low:
	@echo "[]"

task-list-ci-locked:
	@echo "[\"generate\"]"

task-list-ci-high:
	@echo "[]"

supported-features:
	@echo "[\"linux\"]"

%:
	@:
