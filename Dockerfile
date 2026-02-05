FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    lsb-release \
    software-properties-common \
    nginx \
    php-fpm \
    php-json \
    supervisor \
    sqlite3 \
    libsqlite3-dev \
    build-essential \
    libssl-dev \
    libreadline-dev \
    zlib1g-dev \
    libyaml-dev \
    libffi-dev \
    procps \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install RVM and Ruby 3.2.0
ENV RVM_DIR=/usr/local/rvm
RUN gpg2 --keyserver hkp://keyserver.ubuntu.com --recv-keys \
    409B6B1796C275462A1703113804BB82D39DC0E3 \
    7D2BAF1CF37B13E2069D6956105BD0E739499BDB \
    && curl -sSL https://get.rvm.io | bash -s stable \
    && /bin/bash -l -c "source /etc/profile.d/rvm.sh && rvm install 3.2.0 && rvm use 3.2.0 --default"

# Set RVM environment
ENV PATH="${RVM_DIR}/gems/ruby-3.2.0/bin:${RVM_DIR}/rubies/ruby-3.2.0/bin:${RVM_DIR}/bin:${PATH}"
ENV GEM_HOME="${RVM_DIR}/gems/ruby-3.2.0"
ENV GEM_PATH="${RVM_DIR}/gems/ruby-3.2.0:${RVM_DIR}/gems/ruby-3.2.0@global"

# Install Ruby Sass (deprecated, but requested)
RUN /bin/bash -l -c "source /etc/profile.d/rvm.sh && gem install sass:3.7.4"

# Install Bundler and project gems
COPY Gemfile Gemfile.lock* /var/www/html/
WORKDIR /var/www/html
RUN /bin/bash -l -c "source /etc/profile.d/rvm.sh && gem install bundler && bundle install"

# Create necessary directories
RUN mkdir -p /var/www/html \
    && mkdir -p /var/log/supervisor \
    && mkdir -p /run/php

# Copy application files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod +x /var/www/html/stats.rb

# Start Sass in watch mode (compressed output)
RUN mkdir -p /var/www/html/frontend/css
WORKDIR /var/www/html/frontend
CMD ["/bin/sh", "-c", "sass --update scss/:css/ --style compressed & exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"]

# Create uploads directory with proper permissions
RUN mkdir -p /var/www/html/frontend/uploads \
    && mkdir -p /var/www/html/frontend/covers \
    && chown -R www-data:www-data /var/www/html/frontend/uploads \
    && chown -R www-data:www-data /var/www/html/frontend/covers \
    && chmod -R 777 /var/www/html/frontend/uploads \
    && chmod -R 777 /var/www/html/frontend/covers

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php-www.conf /etc/php/8.1/fpm/pool.d/www.conf
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Set working directory
WORKDIR /var/www/html

# Start supervisor
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
