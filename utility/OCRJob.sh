#!/bin/bash
cd /root/Augcast/engine/
make clean
make start &> /root/ocrOut
make clean
mailx -r "augcast@augcast.xyz" -s "OCR completed!" a4o3u4q7a6t5z4h9@110banana.slack.com < /root/ocrOut
