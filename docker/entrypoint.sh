#!/bin/bash
set -e

# Create log directories if they don't exist
mkdir -p /var/log/nginx
mkdir -p /var/log/php-fpm
mkdir -p /var/log/supervisor
mkdir -p /run/php

# Ensure uploads directory exists and has correct permissions
mkdir -p /var/www/html/frontend/uploads
mkdir -p /var/www/html/frontend/covers
chown -R www-data:www-data /var/www/html/frontend/uploads
chown -R www-data:www-data /var/www/html/frontend/covers
chmod -R 777 /var/www/html/frontend/uploads
chmod -R 777 /var/www/html/frontend/covers

# Configure PHP for large uploads
PHP_INI="/etc/php/8.1/fpm/php.ini"
if [ -f "$PHP_INI" ]; then
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 1G/' "$PHP_INI"
    sed -i 's/post_max_size = .*/post_max_size = 1G/' "$PHP_INI"
    sed -i 's/max_execution_time = .*/max_execution_time = 600/' "$PHP_INI"
    sed -i 's/max_input_time = .*/max_input_time = 600/' "$PHP_INI"
    sed -i 's/memory_limit = .*/memory_limit = 512M/' "$PHP_INI"
fi

# Configure PHP-FPM pool for www-data
PHP_FPM_CONF="/etc/php/8.1/fpm/pool.d/www.conf"
if [ -f "$PHP_FPM_CONF" ]; then
    sed -i 's/;request_terminate_timeout = .*/request_terminate_timeout = 600/' "$PHP_FPM_CONF"
fi

# Source RVM for the shell
source /etc/profile.d/rvm.sh

echo "Starting services..."

# Execute the CMD
exec "$@"
