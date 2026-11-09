FROM alpine:3.19
RUN apk add --no-cache nginx chromium font-noto alsa-utils bash supervisor
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY dist/ /var/www/singulyar/
COPY singulyar-kiosk.sh /usr/local/bin/singulyar-kiosk.sh
COPY supervisord.conf /etc/supervisord.conf
EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
