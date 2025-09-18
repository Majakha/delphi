FROM mysql:8.0

# Copy SQL initialization script
COPY schema.sql /docker-entrypoint-initdb.d/

# Set proper permissions
RUN chmod 644 /docker-entrypoint-initdb.d/schema.sql

# Expose MySQL port
EXPOSE 3306

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD mysqladmin ping -h localhost || exit 1

# Use MySQL's default entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["mysqld"]
