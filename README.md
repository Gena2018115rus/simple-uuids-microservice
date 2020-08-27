# simple-uuids-microservice
Microservice is simple https service on node.js

<p><strong>Build and run:</strong></p>
<pre>docker build -t genesys_test . && docker run --name test -p 443:443 -e BASE_UUID=93e8a7ab-7e35-4a41-ab5d-09af3910b5a1 -e LOG_PATH=log genesys_test</pre>

<p><strong>Logs:</strong></p>
<p>With <code>-v</code> flag you can mount host dir into container. If you set <code>LOG_PATH=/container/path/log_file_name_prefix</code>, you can save logs directly to host.</p><pre>docker run -v /host/path:/container/path</pre>

<p><strong>How get http 503:</strong></p>
<p>If <code>BASE_UUID</code> is not valid, server will response <code>503</code> on <code>/health</code>, <code>/v3</code> and <code>/v5</code>.</p>

<p><strong>Details:</strong></p>
<p>You can stop and start container, counters (in metrics) will be continued.</p>

<p>Certificates are self signed.</p>

<p>Worker will be created for every client.</p>

<p>For shutdown you can type <code>^C</code> OR <code>docker stop</code>.</p>
