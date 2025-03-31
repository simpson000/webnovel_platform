package com.webnovel.integration.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate;

    @Value("${crawler.service.url:http://localhost:3001}")
    private String crawlerServiceUrl;

    public ApiController(JdbcTemplate jdbcTemplate, RestTemplate restTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.restTemplate = restTemplate;
    }

    // 소설 목록 조회
    @GetMapping("/novels")
    public ResponseEntity<List<Map<String, Object>>> getAllNovels(
            @RequestParam(required = false) String genre,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String sql;
        if (genre != null && !genre.isEmpty()) {
            sql = "SELECT n.* FROM novels n JOIN novel_genres ng ON n.id = ng.novel_id " +
                    "JOIN genres g ON ng.genre_id = g.id WHERE g.name = ? " +
                    "ORDER BY n.popularity DESC LIMIT ? OFFSET ?";
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, genre, size, page * size));
        } else {
            sql = "SELECT * FROM novels ORDER BY popularity DESC LIMIT ? OFFSET ?";
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, size, page * size));
        }
    }
    @GetMapping("/novels/platform/{platform}")
    public ResponseEntity<List<Map<String, Object>>> getPlatformNovels(
            @PathVariable String platform,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        try {
            String sql = "SELECT n.*, pi.* " +
                    "FROM novels n " +
                    "JOIN platform_infos pi ON n.id = pi.novel_id " +
                    "WHERE pi.platform_name = ? " +
                    "ORDER BY n.last_crawled_at DESC " +
                    "LIMIT ? OFFSET ?";

            List<Map<String, Object>> novels = jdbcTemplate.queryForList(
                    sql, platform, size, page * size);

            // 각 소설의 장르 정보 추가
            for (Map<String, Object> novel : novels) {
                Long novelId = (Long) novel.get("id");
                String genreSql = "SELECT g.name FROM genres g " +
                        "JOIN novel_genres ng ON g.id = ng.genre_id " +
                        "WHERE ng.novel_id = ?";
                List<String> genres = jdbcTemplate.queryForList(genreSql, String.class, novelId);
                novel.put("genres", genres);
            }

            return ResponseEntity.ok(novels);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ArrayList<>());
        }
    }
    // 소설 상세 조회
    @GetMapping("/novels/{id}")
    public ResponseEntity<Map<String, Object>> getNovelDetail(@PathVariable Long id) {
        String sql = "SELECT * FROM novels WHERE id = ?";
        Map<String, Object> novel = jdbcTemplate.queryForMap(sql, id);

        // 장르 정보 추가
        String genreSql = "SELECT g.name FROM genres g JOIN novel_genres ng ON g.id = ng.genre_id WHERE ng.novel_id = ?";
        List<String> genres = jdbcTemplate.queryForList(genreSql, String.class, id);
        novel.put("genres", genres);

        // 플랫폼 정보 추가
        String platformSql = "SELECT * FROM platform_infos WHERE novel_id = ?";
        List<Map<String, Object>> platforms = jdbcTemplate.queryForList(platformSql, id);
        novel.put("platforms", platforms);

        return ResponseEntity.ok(novel);
    }

    // 인기 소설 조회
    @GetMapping("/novels/popular")
    public ResponseEntity<List<Map<String, Object>>> getPopularNovels() {
        String sql = "SELECT * FROM novels ORDER BY popularity DESC LIMIT 10";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    // 장르 목록 조회
    @GetMapping("/genres")
    public ResponseEntity<List<Map<String, Object>>> getAllGenres() {
        String sql = "SELECT * FROM genres";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    // 크롤링 작업 트리거
    @PostMapping("/crawler/trigger/{platform}")
    public ResponseEntity<Object> triggerCrawling(@PathVariable String platform) {
        try {
            // 요청 로깅 추가
            System.out.println("크롤링 요청 받음: " + platform);

            // URL 구성 확인
            String url = crawlerServiceUrl + "/crawl/" + platform;
            System.out.println("크롤링 서비스 URL: " + url);

            // 응답 타임아웃 설정 (10초)
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(10000);
            requestFactory.setReadTimeout(10000);
            RestTemplate timeoutTemplate = new RestTemplate(requestFactory);

            // 크롤링 서비스 호출 (비동기로 처리)
            new Thread(() -> {
                try {
                    timeoutTemplate.postForEntity(url, null, String.class);
                } catch (Exception e) {
                    System.err.println("크롤링 서비스 호출 오류: " + e.getMessage());
                }
            }).start();

            // 즉시 응답 반환
            return ResponseEntity.ok("크롤링 요청이 전송되었습니다. 상태는 API를 통해 확인할 수 있습니다.");
        } catch (Exception e) {
            System.err.println("컨트롤러 오류: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("크롤링 요청 처리 중 오류: " + e.getMessage());
        }
    }

    // 크롤링 상태 조회
    @GetMapping("/crawler/status")
    public ResponseEntity<List<Map<String, Object>>> getCrawlerStatus() {
        String sql = "SELECT * FROM crawler_logs ORDER BY start_time DESC LIMIT 10";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }
}