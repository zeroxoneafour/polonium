#!/bin/sh

# sonarqube scanning, this token only works on my literal laptop so no need to see as a security flaw
SONAR_TOKEN=sqp_772400ca02592db6c55bb949a166071064931f67

/opt/sonar-scanner/bin/sonar-scanner \
  -Dsonar.projectKey=Polonium \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=$SONAR_TOKEN
