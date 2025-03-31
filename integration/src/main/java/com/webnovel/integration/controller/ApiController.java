package com.webnovel.integration.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<String> triggerCrawling(@PathVariable String platform) {
        try {
            // 크롤러 서비스 호출
            restTemplate.postForEntity(
                    crawlerServiceUrl + "/api/crawl/" + platform,
                    null,
                    String.class
            );
            return ResponseEntity.ok("Crawling job triggered for platform: " + platform);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to trigger crawling: " + e.getMessage());
        }
    }

    // 크롤링 상태 조회
    @GetMapping("/crawler/status")
    public ResponseEntity<List<Map<String, Object>>> getCrawlerStatus() {
        String sql = "SELECT * FROM crawler_logs ORDER BY start_time DESC LIMIT 10";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }
}