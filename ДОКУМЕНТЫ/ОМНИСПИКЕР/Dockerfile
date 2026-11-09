FROM alpine:3.19
RUN apk add --no-cache nginx chromium font-noto alsa-utils bash supervisor python3 py3-cryptography openssl
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY dist/ /var/www/singulyar/
COPY generate_node_passport.py /usr/local/bin/generate_node_passport.py
COPY singulyar-kiosk.sh /usr/local/bin/singulyar-kiosk.sh
RUN chmod +x /usr/local/bin/generate_node_passport.py /usr/local/bin/singulyar-kiosk.sh
EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
