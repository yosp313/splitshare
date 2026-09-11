#!/bin/sh
# Pick the nginx config by certificate presence: plain HTTP (with ACME
# webroot) until certbot issues, then the full 443 config. Keeps the
# container bootable on a fresh host with no certs yet.
set -eu
CERT=/etc/letsencrypt/live/splitshare.youssef-ayman.me/fullchain.pem
if [ -f "$CERT" ]; then
  echo "entrypoint: certificate found, serving HTTPS"
  exec nginx -g 'daemon off;'
else
  echo "entrypoint: no certificate yet, serving HTTP-only (run certbot, then restart nginx)"
  exec nginx -c /etc/nginx/nginx.http-only.conf -g 'daemon off;'
fi
