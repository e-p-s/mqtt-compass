# The web UI is built with Node.js and copied into the Python package.
FROM node:24-alpine AS frontend

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# The build normally goes to ../mqtt_compass/static - inside the image it goes to /static.
RUN npx vite build --outDir /static --emptyOutDir


FROM python:3.13-alpine

LABEL org.opencontainers.image.title="MQTT Compass" \
      org.opencontainers.image.description="A MQTT explorer with a classic object tree."

WORKDIR /app

COPY pyproject.toml README.md ./
COPY mqtt_compass/ ./mqtt_compass/
# The built web UI replaces the folder of the package.
COPY --from=frontend /static/ ./mqtt_compass/static/

RUN pip install --no-cache-dir ".[server]"

EXPOSE 8088

ENV MQTT_COMPASS_HOST=0.0.0.0 \
    MQTT_COMPASS_PORT=8088 \
    MQTT_COMPASS_BROKER_HOST=localhost \
    MQTT_COMPASS_BROKER_PORT=1883

CMD ["python", "-m", "mqtt_compass"]
