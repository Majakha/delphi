FROM mysql:8.0

# Set environment variables
ENV MYSQL_DATABASE=mydatabase
ENV MYSQL_ROOT_PASSWORD=example
ENV MYSQL_USER=delphi
ENV MYSQL_PASSWORD=delphi123

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/

# Set proper permissions
RUN chmod 644 /docker-entrypoint-initdb.d/init.sql

# Expose MySQL port
EXPOSE 3306

# Use the default MySQL entrypoint
CMD ["mysqld"]
