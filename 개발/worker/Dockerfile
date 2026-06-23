# 렌더 워커 — Node 22(supabase-js WebSocket) + system ffmpeg(drawtext 포함; ffmpeg-static Linux엔 drawtext 없음).
FROM node:22-slim

# ffmpeg(+ffprobe) = drawtext/libfreetype 포함된 apt 빌드. 한글 자막용 폰트는 assets/NotoSansKR로 fontfile 지정.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# 워커가 system ffmpeg를 쓰도록(ffmpeg.js가 FFMPEG_PATH/FFPROBE_PATH 우선).
ENV FFMPEG_PATH=ffmpeg
ENV FFPROBE_PATH=ffprobe
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

CMD ["node", "src/index.js"]
