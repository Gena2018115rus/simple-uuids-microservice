# simple-uuids-microservice
Microservice is simple https service on node.js

<p><strong>Build and run:</strong></p>
<pre>docker build -t genesys_test . && docker run --rm --name test -p 443:443 -e BASE_UUID=93e8a7ab-7e35-4a41-ab5d-09af3910b5a1 -e LOG_PATH=log genesys_test</pre>
