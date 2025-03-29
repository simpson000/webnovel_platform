<div align="center">
  <img src="https://via.placeholder.com/150?text=WebNovel" alt="웹소설 통합 플랫폼 로고" width="150" height="150">
  <h1>웹소설 통합 플랫폼</h1>
  <p>여러 웹소설 플랫폼의 콘텐츠를 한 곳에서 관리하고 즐기세요</p>
  
  <div>
    <img src="https://img.shields.io/badge/status-development-blue" alt="Status">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <img src="https://img.shields.io/badge/version-0.1.0-orange" alt="Version">
  </div>
</div>

---

## 📚 프로젝트 소개

**웹소설 통합 플랫폼**은 네이버 시리즈, 카카오페이지 등 여러 웹소설 플랫폼에 분산된 콘텐츠를 하나의 인터페이스에서 확인하고 관리할 수 있는 서비스입니다. 다양한 플랫폼을 오가는 번거로움 없이 좋아하는 웹소설을 한 곳에서 찾고, 관리하고, 추천받을 수 있습니다.

## 🎯 주요 기능

- 🔍 **통합 검색** - 여러 플랫폼의 웹소설을 한 번에 검색
- 🔄 **실시간 업데이트** - 최신 웹소설 정보 자동 업데이트
- 🏷️ **고급 필터링** - 장르, 태그, 완결 여부 등 다양한 조건으로 필터링
- 💡 **맞춤 추천** - 사용자 취향에 맞는 개인화된 웹소설 추천
- 🔖 **북마크 관리** - 관심 작품을 북마크하고 업데이트 알림 받기
- 📊 **통계 및 분석** - 읽은 작품, 선호 장르 등 독서 패턴 분석

## 🛠️ 기술 스택

<table>
  <tr>
    <td align="center"><strong>백엔드</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Java-007396?style=flat&logo=java&logoColor=white" alt="Java">
      <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white" alt="Spring Boot">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>데이터베이스</strong></td>
    <td>
      <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white" alt="MySQL">
      <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>크롤링</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
      <img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=flat&logo=puppeteer&logoColor=white" alt="Puppeteer">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>프론트엔드</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=flat&logo=vue.js&logoColor=white" alt="Vue.js">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>인프라</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker">
      <img src="https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white" alt="AWS">
    </td>
  </tr>
</table>

## 📋 개발 현황

현재 프로젝트는 초기 설정 단계에 있으며, 다음과 같은 작업을 진행 중입니다:

- [x] 프로젝트 구조 설계
- [ ] 데이터베이스 스키마 설계
- [ ] 네이버 시리즈 크롤러 구현
- [ ] 기본 API 엔드포인트 구현

## 🚀 시작하기

### 요구사항

- Java 17+
- Node.js 16+
- MySQL 8+
- Docker & Docker Compose

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/webnovel-platform.git
cd webnovel-platform

# 의존성 설치
./mvnw install

# 개발 환경 실행
docker-compose up -d
./mvnw spring-boot:run

📚 문서

상세 설계 문서
API 문서
개발 가이드


📄 라이센스
이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.
