FROM node:14.8.0

WORKDIR /www

COPY server.js          server.js
COPY requestHandlers.js requestHandlers.js
COPY header.js          header.js
COPY cert.pem           cert.pem
COPY key.pem            key.pem
RUN echo "0 0 0 0" > counters.txt

RUN npm install --global --production uuid threads tiny-worker


EXPOSE 443/tcp

CMD ["node", "server.js"]

