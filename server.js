/**
 * server.js
 * 설명: 로컬 컴퓨터에서 웹 화면과 백엔드 API를 손쉽게 실행해 볼 수 있는 개발용 경량 웹 서버
 * 
 * [초보자를 위한 가이드]
 * - 'npm start' 또는 'npm run dev' 명령어를 터미널에 입력하면 이 파일이 실행됩니다.
 * - .env 파일에 입력하신 키들을 자동으로 불러오며, 브라우저에서 'http://localhost:3000'으로 접속할 수 있습니다.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// 1. .env 환경 변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME 타입 매핑 (브라우저가 파일 형식을 인식하도록 지원)
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 2. HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // [API 요청 처리]: POST /api/search
  if (pathname === '/api/search') {
    try {
      // 요청 본문(Body) 수신
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          // Vercel Serverless Function 형태의 mock req, res 객체 구성
          const parsedBody = body ? JSON.parse(body) : {};
          const mockReq = {
            method: req.method,
            body: parsedBody,
            headers: req.headers,
            query: Object.fromEntries(parsedUrl.searchParams)
          };

          const mockRes = {
            statusCode: 200,
            setHeader: (key, val) => res.setHeader(key, val),
            status: function(code) {
              this.statusCode = code;
              return this;
            },
            json: function(data) {
              res.writeHead(this.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(data));
            }
          };

          // api/search.js 핸들러 모듈 동적 임포트 및 실행
          const searchModule = await import(`./api/search.js?t=${Date.now()}`);
          await searchModule.default(mockReq, mockRes);

        } catch (apiErr) {
          console.error('[API 처리 오류]:', apiErr);
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            error: { code: 'SERVER_ERROR', message: apiErr.message }
          }));
        }
      });
      return;
    } catch (err) {
      res.writeHead(500);
      res.end('API Internal Error');
      return;
    }
  }

  // [정적 웹 파일 서빙]: public/ 폴더
  if (req.method === 'GET') {
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // 디렉터리 경로 보안 검사 (디렉터리 탐색 공격 방지)
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - 요청하신 파일을 찾을 수 없습니다.');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
    return;
  }

  // 기타 지원하지 않는 요청
  res.writeHead(405);
  res.end('Method Not Allowed');
});

// 3. 서버 리슨 시작
server.listen(PORT, () => {
  console.log('========================================================');
  console.log(`⛳ 티업스팟(TeeUpSpot) 로컬 개발 서버가 시작되었습니다!`);
  console.log(`👉 브라우저 주소창에 입력하세요: http://localhost:${PORT}`);
  console.log('========================================================');
  console.log('종료하려면 터미널에서 [Ctrl + C]를 누르시면 됩니다.\n');
});

